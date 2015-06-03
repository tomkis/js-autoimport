'use babel';

import { BufferedNodeProcess } from 'atom'

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

      new BufferedNodeProcess({
        command: command,
        args: args,
        stdout: (chunk) => {
          data += chunk;
        },
        stderr: (reason) => {
          reject({
            reason: reason,
            args: args
          });
        },
        exit: (code) => {
          resolve({
            data: data,
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
