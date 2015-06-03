'use babel';

const path = require('path');
const spawn = require('child_process').spawn;
const _ = require('lodash');

export default class BufferedNodeProcessExecutorPool {

  constructor() {
    this.executors = [];
    this.waiting = [];
  }

  execute(command, args) {
    if (this.isAvailableExector()) {
      const executor = this.executeInternal(command, args);
      this.executors.push(executor);
      return executor;
    } else {
      return new Promise((resolve, reject) => {
        this.waiting.push({
          command: command,
          args: args,
          resolve: resolve,
          reject: reject
        });
      });
    }
  }

  releaseExecutor(proc) {
    this.executors = _.without(this.executors, proc);

    const nextExecutor = this.waiting.pop();
    if (nextExecutor) {
      this.executors.push(
        this.executeInternal(
          nextExecutor.command,
          nextExecutor.args,
          nextExecutor.resolve,
          nextExecutor.reject
        )
      );
    }
  }

  executeInternal(command, args, resolve, reject) {
    const executor = this.executeBufferedNodeProcess(command, args)
      .then((response) => {
        this.releaseExecutor(executor);

        if (resolve) {
          resolve(response);
        }

        return response;
      })
      .catch((reason) => {
        this.releaseExecutor(executor);

        if (reject) {
          reject(reason);
        } else {
          throw reason;
        }
      });

    return executor;
  }

  executeBufferedNodeProcess(command, args) {
    return new Promise((resolve, reject) => {
      let data = '';
      let errorData = '';

      // BufferedNodeProcess is bugged on windows, this is just a temporal workaround
      // @see https://github.com/atom/atom/issues/2887
      const child = spawn(process.execPath, [command].concat(args), {
        cwd: path.dirname(command),
        env: {
          ATOM_SHELL_INTERNAL_RUN_AS_NODE: 1
        },
        stdio: ['ipc']
      });
      child.stdout.on('data', (chunk) => {
        data += chunk;
      });
      child.stderr.on('data', (chunk) => {
        errorData += chunk;
      });
      child.on('exit', (exitCode) => {
        if (exitCode === 0) {
          resolve({
            data: data,
            args: args
          });
        } else {
          reject({
            data: errorData,
            args: args
          });
        }
      });
    });
  }

  isAvailableExector() {
    return this.executors.length < this.getMaximumConcurrentExecutions();
  }

  getMaximumConcurrentExecutions() {
    return 8;
  }
}
