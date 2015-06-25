## 0.2.0 - Initial release
* Just an initial release

## 0.2.1 - Working on Windows
* The plugin is now usable also on Windows

## 0.3.0 - Improved exports behaviour
* It's now possible to use default exports in conjunction with named exports, results in `import foo, {bar} from './foo.js'`
* It's possible to set ignored folders and allowed suffixes in settings
* Fixed bug when export index was not loaded properly after start, if the name of the project was same as any of ignored folders

## 0.4.0 - Supporting full ECMA6 import/export spec
* Supporting named exports
* Supporting namespace exports
* Supporting file imports

## 0.5.0 - Configurable trailing semicolon and space between braces
* Trailing semicolon for import formatting is now configurable
* Space between braces is now configurable `import {a} from` vs `import { a } from`
