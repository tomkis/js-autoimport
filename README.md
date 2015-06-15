# js-autoimport

Autocomplete+ provider which displays suggestions based on ES6 exports / imports.

![js-autoimport](http://g.recordit.co/6AjljFaymk.gif)

## Installation

Installation is done via atom APM, you can install it easily in your Atom editor.

## Usage

Consider you have `export class FooBar` anywhere in your project, just type either
`Fo` or `FB` to get suggestion, the import statement should get automatically
added to currently opened file after confirming.

## Supported features

- Named export
  - `export function foo()`
- Default export
  - `export function()`
  - `import FOO, {BAR} from './foo.js'`
- Entire file import
  - `import './foo.js'`
- Alias imports
  - `import Foo as Bar from './foo.js'`
- Asterisk imports
  - `import * as Foo from './foo.js'`

## Contribute

All issues and feature requests are much appreciated.
