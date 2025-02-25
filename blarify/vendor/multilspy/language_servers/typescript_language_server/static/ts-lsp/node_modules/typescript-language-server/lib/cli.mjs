#!/usr/bin/env node
import fs$l, { promises, statSync, existsSync, readFileSync as readFileSync$1 } from 'node:fs';

import require$$0 from 'events';

import require$$1 from 'child_process';

import require$$1$1 from 'path';

import require$$0$1 from 'fs';

import require$$4 from 'process';

import require$$0$4, { promisify as promisify$1 } from 'node:util';

import require$$0$2, { promisify } from 'util';

import require$$2 from 'os';

import crypto from 'crypto';

import require$$4$1 from 'net';

import require$$0$3 from 'url';

import * as path$e from 'node:path';

import path__default, { extname, resolve as resolve$1 } from 'node:path';

import require$$0$5 from 'constants';

import require$$0$6 from 'stream';

import require$$5 from 'assert';

import os from 'node:os';

import 'node:fs/promises';

import stream from 'node:stream';

import ChildProcess from 'node:child_process';

import { createRequire } from 'node:module';

import require$$1$2 from 'fs/promises';

import { fileURLToPath } from 'node:url';

import process$2 from 'node:process';

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var commander = {};

var argument = {};

var error$2 = {};

let CommanderError$3 = class CommanderError extends Error {
  constructor(exitCode, code, message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.code = code;
    this.exitCode = exitCode;
    this.nestedError = undefined;
  }
};

let InvalidArgumentError$4 = class InvalidArgumentError extends CommanderError$3 {
  constructor(message) {
    super(1, 'commander.invalidArgument', message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
};

error$2.CommanderError = CommanderError$3;

error$2.InvalidArgumentError = InvalidArgumentError$4;

const {InvalidArgumentError: InvalidArgumentError$3} = error$2;

let Argument$3 = class Argument {
  constructor(name, description) {
    this.description = description || '';
    this.variadic = false;
    this.parseArg = undefined;
    this.defaultValue = undefined;
    this.defaultValueDescription = undefined;
    this.argChoices = undefined;
    switch (name[0]) {
     case '<':
      this.required = true;
      this._name = name.slice(1, -1);
      break;

     case '[':
      this.required = false;
      this._name = name.slice(1, -1);
      break;

     default:
      this.required = true;
      this._name = name;
      break;
    }
    if (this._name.length > 3 && this._name.slice(-3) === '...') {
      this.variadic = true;
      this._name = this._name.slice(0, -3);
    }
  }
  name() {
    return this._name;
  }
  _concatValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [ value ];
    }
    return previous.concat(value);
  }
  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  }
  argParser(fn) {
    this.parseArg = fn;
    return this;
  }
  choices(values) {
    this.argChoices = values.slice();
    this.parseArg = (arg, previous) => {
      if (!this.argChoices.includes(arg)) {
        throw new InvalidArgumentError$3(`Allowed choices are ${this.argChoices.join(', ')}.`);
      }
      if (this.variadic) {
        return this._concatValue(arg, previous);
      }
      return arg;
    };
    return this;
  }
  argRequired() {
    this.required = true;
    return this;
  }
  argOptional() {
    this.required = false;
    return this;
  }
};

function humanReadableArgName$2(arg) {
  const nameOutput = arg.name() + (arg.variadic === true ? '...' : '');
  return arg.required ? '<' + nameOutput + '>' : '[' + nameOutput + ']';
}

argument.Argument = Argument$3;

argument.humanReadableArgName = humanReadableArgName$2;

var command = {};

var help = {};

const {humanReadableArgName: humanReadableArgName$1} = argument;

let Help$3 = class Help {
  constructor() {
    this.helpWidth = undefined;
    this.sortSubcommands = false;
    this.sortOptions = false;
    this.showGlobalOptions = false;
  }
  visibleCommands(cmd) {
    const visibleCommands = cmd.commands.filter((cmd => !cmd._hidden));
    const helpCommand = cmd._getHelpCommand();
    if (helpCommand && !helpCommand._hidden) {
      visibleCommands.push(helpCommand);
    }
    if (this.sortSubcommands) {
      visibleCommands.sort(((a, b) => a.name().localeCompare(b.name())));
    }
    return visibleCommands;
  }
  compareOptions(a, b) {
    const getSortKey = option => option.short ? option.short.replace(/^-/, '') : option.long.replace(/^--/, '');
    return getSortKey(a).localeCompare(getSortKey(b));
  }
  visibleOptions(cmd) {
    const visibleOptions = cmd.options.filter((option => !option.hidden));
    const helpOption = cmd._getHelpOption();
    if (helpOption && !helpOption.hidden) {
      const removeShort = helpOption.short && cmd._findOption(helpOption.short);
      const removeLong = helpOption.long && cmd._findOption(helpOption.long);
      if (!removeShort && !removeLong) {
        visibleOptions.push(helpOption);
      } else if (helpOption.long && !removeLong) {
        visibleOptions.push(cmd.createOption(helpOption.long, helpOption.description));
      } else if (helpOption.short && !removeShort) {
        visibleOptions.push(cmd.createOption(helpOption.short, helpOption.description));
      }
    }
    if (this.sortOptions) {
      visibleOptions.sort(this.compareOptions);
    }
    return visibleOptions;
  }
  visibleGlobalOptions(cmd) {
    if (!this.showGlobalOptions) return [];
    const globalOptions = [];
    for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
      const visibleOptions = ancestorCmd.options.filter((option => !option.hidden));
      globalOptions.push(...visibleOptions);
    }
    if (this.sortOptions) {
      globalOptions.sort(this.compareOptions);
    }
    return globalOptions;
  }
  visibleArguments(cmd) {
    if (cmd._argsDescription) {
      cmd.registeredArguments.forEach((argument => {
        argument.description = argument.description || cmd._argsDescription[argument.name()] || '';
      }));
    }
    if (cmd.registeredArguments.find((argument => argument.description))) {
      return cmd.registeredArguments;
    }
    return [];
  }
  subcommandTerm(cmd) {
    const args = cmd.registeredArguments.map((arg => humanReadableArgName$1(arg))).join(' ');
    return cmd._name + (cmd._aliases[0] ? '|' + cmd._aliases[0] : '') + (cmd.options.length ? ' [options]' : '') + (args ? ' ' + args : '');
  }
  optionTerm(option) {
    return option.flags;
  }
  argumentTerm(argument) {
    return argument.name();
  }
  longestSubcommandTermLength(cmd, helper) {
    return helper.visibleCommands(cmd).reduce(((max, command) => Math.max(max, helper.subcommandTerm(command).length)), 0);
  }
  longestOptionTermLength(cmd, helper) {
    return helper.visibleOptions(cmd).reduce(((max, option) => Math.max(max, helper.optionTerm(option).length)), 0);
  }
  longestGlobalOptionTermLength(cmd, helper) {
    return helper.visibleGlobalOptions(cmd).reduce(((max, option) => Math.max(max, helper.optionTerm(option).length)), 0);
  }
  longestArgumentTermLength(cmd, helper) {
    return helper.visibleArguments(cmd).reduce(((max, argument) => Math.max(max, helper.argumentTerm(argument).length)), 0);
  }
  commandUsage(cmd) {
    let cmdName = cmd._name;
    if (cmd._aliases[0]) {
      cmdName = cmdName + '|' + cmd._aliases[0];
    }
    let ancestorCmdNames = '';
    for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
      ancestorCmdNames = ancestorCmd.name() + ' ' + ancestorCmdNames;
    }
    return ancestorCmdNames + cmdName + ' ' + cmd.usage();
  }
  commandDescription(cmd) {
    return cmd.description();
  }
  subcommandDescription(cmd) {
    return cmd.summary() || cmd.description();
  }
  optionDescription(option) {
    const extraInfo = [];
    if (option.argChoices) {
      extraInfo.push(`choices: ${option.argChoices.map((choice => JSON.stringify(choice))).join(', ')}`);
    }
    if (option.defaultValue !== undefined) {
      const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === 'boolean';
      if (showDefault) {
        extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
      }
    }
    if (option.presetArg !== undefined && option.optional) {
      extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
    }
    if (option.envVar !== undefined) {
      extraInfo.push(`env: ${option.envVar}`);
    }
    if (extraInfo.length > 0) {
      return `${option.description} (${extraInfo.join(', ')})`;
    }
    return option.description;
  }
  argumentDescription(argument) {
    const extraInfo = [];
    if (argument.argChoices) {
      extraInfo.push(`choices: ${argument.argChoices.map((choice => JSON.stringify(choice))).join(', ')}`);
    }
    if (argument.defaultValue !== undefined) {
      extraInfo.push(`default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`);
    }
    if (extraInfo.length > 0) {
      const extraDescripton = `(${extraInfo.join(', ')})`;
      if (argument.description) {
        return `${argument.description} ${extraDescripton}`;
      }
      return extraDescripton;
    }
    return argument.description;
  }
  formatHelp(cmd, helper) {
    const termWidth = helper.padWidth(cmd, helper);
    const helpWidth = helper.helpWidth || 80;
    const itemIndentWidth = 2;
    const itemSeparatorWidth = 2;
    function formatItem(term, description) {
      if (description) {
        const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
        return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
      }
      return term;
    }
    function formatList(textArray) {
      return textArray.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth));
    }
    let output = [ `Usage: ${helper.commandUsage(cmd)}`, '' ];
    const commandDescription = helper.commandDescription(cmd);
    if (commandDescription.length > 0) {
      output = output.concat([ helper.wrap(commandDescription, helpWidth, 0), '' ]);
    }
    const argumentList = helper.visibleArguments(cmd).map((argument => formatItem(helper.argumentTerm(argument), helper.argumentDescription(argument))));
    if (argumentList.length > 0) {
      output = output.concat([ 'Arguments:', formatList(argumentList), '' ]);
    }
    const optionList = helper.visibleOptions(cmd).map((option => formatItem(helper.optionTerm(option), helper.optionDescription(option))));
    if (optionList.length > 0) {
      output = output.concat([ 'Options:', formatList(optionList), '' ]);
    }
    if (this.showGlobalOptions) {
      const globalOptionList = helper.visibleGlobalOptions(cmd).map((option => formatItem(helper.optionTerm(option), helper.optionDescription(option))));
      if (globalOptionList.length > 0) {
        output = output.concat([ 'Global Options:', formatList(globalOptionList), '' ]);
      }
    }
    const commandList = helper.visibleCommands(cmd).map((cmd => formatItem(helper.subcommandTerm(cmd), helper.subcommandDescription(cmd))));
    if (commandList.length > 0) {
      output = output.concat([ 'Commands:', formatList(commandList), '' ]);
    }
    return output.join('\n');
  }
  padWidth(cmd, helper) {
    return Math.max(helper.longestOptionTermLength(cmd, helper), helper.longestGlobalOptionTermLength(cmd, helper), helper.longestSubcommandTermLength(cmd, helper), helper.longestArgumentTermLength(cmd, helper));
  }
  wrap(str, width, indent, minColumnWidth = 40) {
    const indents = ' \\f\\t\\v   -   　\ufeff';
    const manualIndent = new RegExp(`[\\n][${indents}]+`);
    if (str.match(manualIndent)) return str;
    const columnWidth = width - indent;
    if (columnWidth < minColumnWidth) return str;
    const leadingStr = str.slice(0, indent);
    const columnText = str.slice(indent).replace('\r\n', '\n');
    const indentString = ' '.repeat(indent);
    const zeroWidthSpace = '​';
    const breaks = `\\s${zeroWidthSpace}`;
    const regex = new RegExp(`\n|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`, 'g');
    const lines = columnText.match(regex) || [];
    return leadingStr + lines.map(((line, i) => {
      if (line === '\n') return '';
      return (i > 0 ? indentString : '') + line.trimEnd();
    })).join('\n');
  }
};

help.Help = Help$3;

var option = {};

const {InvalidArgumentError: InvalidArgumentError$2} = error$2;

let Option$3 = class Option {
  constructor(flags, description) {
    this.flags = flags;
    this.description = description || '';
    this.required = flags.includes('<');
    this.optional = flags.includes('[');
    this.variadic = /\w\.\.\.[>\]]$/.test(flags);
    this.mandatory = false;
    const optionFlags = splitOptionFlags(flags);
    this.short = optionFlags.shortFlag;
    this.long = optionFlags.longFlag;
    this.negate = false;
    if (this.long) {
      this.negate = this.long.startsWith('--no-');
    }
    this.defaultValue = undefined;
    this.defaultValueDescription = undefined;
    this.presetArg = undefined;
    this.envVar = undefined;
    this.parseArg = undefined;
    this.hidden = false;
    this.argChoices = undefined;
    this.conflictsWith = [];
    this.implied = undefined;
  }
  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  }
  preset(arg) {
    this.presetArg = arg;
    return this;
  }
  conflicts(names) {
    this.conflictsWith = this.conflictsWith.concat(names);
    return this;
  }
  implies(impliedOptionValues) {
    let newImplied = impliedOptionValues;
    if (typeof impliedOptionValues === 'string') {
      newImplied = {
        [impliedOptionValues]: true
      };
    }
    this.implied = Object.assign(this.implied || {}, newImplied);
    return this;
  }
  env(name) {
    this.envVar = name;
    return this;
  }
  argParser(fn) {
    this.parseArg = fn;
    return this;
  }
  makeOptionMandatory(mandatory = true) {
    this.mandatory = !!mandatory;
    return this;
  }
  hideHelp(hide = true) {
    this.hidden = !!hide;
    return this;
  }
  _concatValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [ value ];
    }
    return previous.concat(value);
  }
  choices(values) {
    this.argChoices = values.slice();
    this.parseArg = (arg, previous) => {
      if (!this.argChoices.includes(arg)) {
        throw new InvalidArgumentError$2(`Allowed choices are ${this.argChoices.join(', ')}.`);
      }
      if (this.variadic) {
        return this._concatValue(arg, previous);
      }
      return arg;
    };
    return this;
  }
  name() {
    if (this.long) {
      return this.long.replace(/^--/, '');
    }
    return this.short.replace(/^-/, '');
  }
  attributeName() {
    return camelcase(this.name().replace(/^no-/, ''));
  }
  is(arg) {
    return this.short === arg || this.long === arg;
  }
  isBoolean() {
    return !this.required && !this.optional && !this.negate;
  }
};

let DualOptions$1 = class DualOptions {
  constructor(options) {
    this.positiveOptions = new Map;
    this.negativeOptions = new Map;
    this.dualOptions = new Set;
    options.forEach((option => {
      if (option.negate) {
        this.negativeOptions.set(option.attributeName(), option);
      } else {
        this.positiveOptions.set(option.attributeName(), option);
      }
    }));
    this.negativeOptions.forEach(((value, key) => {
      if (this.positiveOptions.has(key)) {
        this.dualOptions.add(key);
      }
    }));
  }
  valueFromOption(value, option) {
    const optionKey = option.attributeName();
    if (!this.dualOptions.has(optionKey)) return true;
    const preset = this.negativeOptions.get(optionKey).presetArg;
    const negativeValue = preset !== undefined ? preset : false;
    return option.negate === (negativeValue === value);
  }
};

function camelcase(str) {
  return str.split('-').reduce(((str, word) => str + word[0].toUpperCase() + word.slice(1)));
}

function splitOptionFlags(flags) {
  let shortFlag;
  let longFlag;
  const flagParts = flags.split(/[ |,]+/);
  if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1])) shortFlag = flagParts.shift();
  longFlag = flagParts.shift();
  if (!shortFlag && /^-[^-]$/.test(longFlag)) {
    shortFlag = longFlag;
    longFlag = undefined;
  }
  return {
    shortFlag: shortFlag,
    longFlag: longFlag
  };
}

option.Option = Option$3;

option.DualOptions = DualOptions$1;

var suggestSimilar$2 = {};

const maxDistance = 3;

function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > maxDistance) return Math.max(a.length, b.length);
  const d = [];
  for (let i = 0; i <= a.length; i++) {
    d[i] = [ i ];
  }
  for (let j = 0; j <= b.length; j++) {
    d[0][j] = j;
  }
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      let cost = 1;
      if (a[i - 1] === b[j - 1]) {
        cost = 0;
      } else {
        cost = 1;
      }
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

function suggestSimilar$1(word, candidates) {
  if (!candidates || candidates.length === 0) return '';
  candidates = Array.from(new Set(candidates));
  const searchingOptions = word.startsWith('--');
  if (searchingOptions) {
    word = word.slice(2);
    candidates = candidates.map((candidate => candidate.slice(2)));
  }
  let similar = [];
  let bestDistance = maxDistance;
  const minSimilarity = .4;
  candidates.forEach((candidate => {
    if (candidate.length <= 1) return;
    const distance = editDistance(word, candidate);
    const length = Math.max(word.length, candidate.length);
    const similarity = (length - distance) / length;
    if (similarity > minSimilarity) {
      if (distance < bestDistance) {
        bestDistance = distance;
        similar = [ candidate ];
      } else if (distance === bestDistance) {
        similar.push(candidate);
      }
    }
  }));
  similar.sort(((a, b) => a.localeCompare(b)));
  if (searchingOptions) {
    similar = similar.map((candidate => `--${candidate}`));
  }
  if (similar.length > 1) {
    return `\n(Did you mean one of ${similar.join(', ')}?)`;
  }
  if (similar.length === 1) {
    return `\n(Did you mean ${similar[0]}?)`;
  }
  return '';
}

suggestSimilar$2.suggestSimilar = suggestSimilar$1;

const EventEmitter = require$$0.EventEmitter;

const childProcess = require$$1;

const path$d = require$$1$1;

const fs$k = require$$0$1;

const process$1 = require$$4;

const {Argument: Argument$2, humanReadableArgName: humanReadableArgName} = argument;

const {CommanderError: CommanderError$2} = error$2;

const {Help: Help$2} = help;

const {Option: Option$2, DualOptions: DualOptions} = option;

const {suggestSimilar: suggestSimilar} = suggestSimilar$2;

let Command$2 = class Command extends EventEmitter {
  constructor(name) {
    super();
    this.commands = [];
    this.options = [];
    this.parent = null;
    this._allowUnknownOption = false;
    this._allowExcessArguments = true;
    this.registeredArguments = [];
    this._args = this.registeredArguments;
    this.args = [];
    this.rawArgs = [];
    this.processedArgs = [];
    this._scriptPath = null;
    this._name = name || '';
    this._optionValues = {};
    this._optionValueSources = {};
    this._storeOptionsAsProperties = false;
    this._actionHandler = null;
    this._executableHandler = false;
    this._executableFile = null;
    this._executableDir = null;
    this._defaultCommandName = null;
    this._exitCallback = null;
    this._aliases = [];
    this._combineFlagAndOptionalValue = true;
    this._description = '';
    this._summary = '';
    this._argsDescription = undefined;
    this._enablePositionalOptions = false;
    this._passThroughOptions = false;
    this._lifeCycleHooks = {};
    this._showHelpAfterError = false;
    this._showSuggestionAfterError = true;
    this._outputConfiguration = {
      writeOut: str => process$1.stdout.write(str),
      writeErr: str => process$1.stderr.write(str),
      getOutHelpWidth: () => process$1.stdout.isTTY ? process$1.stdout.columns : undefined,
      getErrHelpWidth: () => process$1.stderr.isTTY ? process$1.stderr.columns : undefined,
      outputError: (str, write) => write(str)
    };
    this._hidden = false;
    this._helpOption = undefined;
    this._addImplicitHelpCommand = undefined;
    this._helpCommand = undefined;
    this._helpConfiguration = {};
  }
  copyInheritedSettings(sourceCommand) {
    this._outputConfiguration = sourceCommand._outputConfiguration;
    this._helpOption = sourceCommand._helpOption;
    this._helpCommand = sourceCommand._helpCommand;
    this._helpConfiguration = sourceCommand._helpConfiguration;
    this._exitCallback = sourceCommand._exitCallback;
    this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
    this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
    this._allowExcessArguments = sourceCommand._allowExcessArguments;
    this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
    this._showHelpAfterError = sourceCommand._showHelpAfterError;
    this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
    return this;
  }
  _getCommandAndAncestors() {
    const result = [];
    for (let command = this; command; command = command.parent) {
      result.push(command);
    }
    return result;
  }
  command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
    let desc = actionOptsOrExecDesc;
    let opts = execOpts;
    if (typeof desc === 'object' && desc !== null) {
      opts = desc;
      desc = null;
    }
    opts = opts || {};
    const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
    const cmd = this.createCommand(name);
    if (desc) {
      cmd.description(desc);
      cmd._executableHandler = true;
    }
    if (opts.isDefault) this._defaultCommandName = cmd._name;
    cmd._hidden = !!(opts.noHelp || opts.hidden);
    cmd._executableFile = opts.executableFile || null;
    if (args) cmd.arguments(args);
    this._registerCommand(cmd);
    cmd.parent = this;
    cmd.copyInheritedSettings(this);
    if (desc) return this;
    return cmd;
  }
  createCommand(name) {
    return new Command(name);
  }
  createHelp() {
    return Object.assign(new Help$2, this.configureHelp());
  }
  configureHelp(configuration) {
    if (configuration === undefined) return this._helpConfiguration;
    this._helpConfiguration = configuration;
    return this;
  }
  configureOutput(configuration) {
    if (configuration === undefined) return this._outputConfiguration;
    Object.assign(this._outputConfiguration, configuration);
    return this;
  }
  showHelpAfterError(displayHelp = true) {
    if (typeof displayHelp !== 'string') displayHelp = !!displayHelp;
    this._showHelpAfterError = displayHelp;
    return this;
  }
  showSuggestionAfterError(displaySuggestion = true) {
    this._showSuggestionAfterError = !!displaySuggestion;
    return this;
  }
  addCommand(cmd, opts) {
    if (!cmd._name) {
      throw new Error(`Command passed to .addCommand() must have a name\n- specify the name in Command constructor or using .name()`);
    }
    opts = opts || {};
    if (opts.isDefault) this._defaultCommandName = cmd._name;
    if (opts.noHelp || opts.hidden) cmd._hidden = true;
    this._registerCommand(cmd);
    cmd.parent = this;
    cmd._checkForBrokenPassThrough();
    return this;
  }
  createArgument(name, description) {
    return new Argument$2(name, description);
  }
  argument(name, description, fn, defaultValue) {
    const argument = this.createArgument(name, description);
    if (typeof fn === 'function') {
      argument.default(defaultValue).argParser(fn);
    } else {
      argument.default(fn);
    }
    this.addArgument(argument);
    return this;
  }
  arguments(names) {
    names.trim().split(/ +/).forEach((detail => {
      this.argument(detail);
    }));
    return this;
  }
  addArgument(argument) {
    const previousArgument = this.registeredArguments.slice(-1)[0];
    if (previousArgument && previousArgument.variadic) {
      throw new Error(`only the last argument can be variadic '${previousArgument.name()}'`);
    }
    if (argument.required && argument.defaultValue !== undefined && argument.parseArg === undefined) {
      throw new Error(`a default value for a required argument is never used: '${argument.name()}'`);
    }
    this.registeredArguments.push(argument);
    return this;
  }
  helpCommand(enableOrNameAndArgs, description) {
    if (typeof enableOrNameAndArgs === 'boolean') {
      this._addImplicitHelpCommand = enableOrNameAndArgs;
      return this;
    }
    enableOrNameAndArgs = enableOrNameAndArgs ?? 'help [command]';
    const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
    const helpDescription = description ?? 'display help for command';
    const helpCommand = this.createCommand(helpName);
    helpCommand.helpOption(false);
    if (helpArgs) helpCommand.arguments(helpArgs);
    if (helpDescription) helpCommand.description(helpDescription);
    this._addImplicitHelpCommand = true;
    this._helpCommand = helpCommand;
    return this;
  }
  addHelpCommand(helpCommand, deprecatedDescription) {
    if (typeof helpCommand !== 'object') {
      this.helpCommand(helpCommand, deprecatedDescription);
      return this;
    }
    this._addImplicitHelpCommand = true;
    this._helpCommand = helpCommand;
    return this;
  }
  _getHelpCommand() {
    const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand('help'));
    if (hasImplicitHelpCommand) {
      if (this._helpCommand === undefined) {
        this.helpCommand(undefined, undefined);
      }
      return this._helpCommand;
    }
    return null;
  }
  hook(event, listener) {
    const allowedValues = [ 'preSubcommand', 'preAction', 'postAction' ];
    if (!allowedValues.includes(event)) {
      throw new Error(`Unexpected value for event passed to hook : '${event}'.\nExpecting one of '${allowedValues.join('\', \'')}'`);
    }
    if (this._lifeCycleHooks[event]) {
      this._lifeCycleHooks[event].push(listener);
    } else {
      this._lifeCycleHooks[event] = [ listener ];
    }
    return this;
  }
  exitOverride(fn) {
    if (fn) {
      this._exitCallback = fn;
    } else {
      this._exitCallback = err => {
        if (err.code !== 'commander.executeSubCommandAsync') {
          throw err;
        }
      };
    }
    return this;
  }
  _exit(exitCode, code, message) {
    if (this._exitCallback) {
      this._exitCallback(new CommanderError$2(exitCode, code, message));
    }
    process$1.exit(exitCode);
  }
  action(fn) {
    const listener = args => {
      const expectedArgsCount = this.registeredArguments.length;
      const actionArgs = args.slice(0, expectedArgsCount);
      if (this._storeOptionsAsProperties) {
        actionArgs[expectedArgsCount] = this;
      } else {
        actionArgs[expectedArgsCount] = this.opts();
      }
      actionArgs.push(this);
      return fn.apply(this, actionArgs);
    };
    this._actionHandler = listener;
    return this;
  }
  createOption(flags, description) {
    return new Option$2(flags, description);
  }
  _callParseArg(target, value, previous, invalidArgumentMessage) {
    try {
      return target.parseArg(value, previous);
    } catch (err) {
      if (err.code === 'commander.invalidArgument') {
        const message = `${invalidArgumentMessage} ${err.message}`;
        this.error(message, {
          exitCode: err.exitCode,
          code: err.code
        });
      }
      throw err;
    }
  }
  _registerOption(option) {
    const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
    if (matchingOption) {
      const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
      throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'\n-  already used by option '${matchingOption.flags}'`);
    }
    this.options.push(option);
  }
  _registerCommand(command) {
    const knownBy = cmd => [ cmd.name() ].concat(cmd.aliases());
    const alreadyUsed = knownBy(command).find((name => this._findCommand(name)));
    if (alreadyUsed) {
      const existingCmd = knownBy(this._findCommand(alreadyUsed)).join('|');
      const newCmd = knownBy(command).join('|');
      throw new Error(`cannot add command '${newCmd}' as already have command '${existingCmd}'`);
    }
    this.commands.push(command);
  }
  addOption(option) {
    this._registerOption(option);
    const oname = option.name();
    const name = option.attributeName();
    if (option.negate) {
      const positiveLongFlag = option.long.replace(/^--no-/, '--');
      if (!this._findOption(positiveLongFlag)) {
        this.setOptionValueWithSource(name, option.defaultValue === undefined ? true : option.defaultValue, 'default');
      }
    } else if (option.defaultValue !== undefined) {
      this.setOptionValueWithSource(name, option.defaultValue, 'default');
    }
    const handleOptionValue = (val, invalidValueMessage, valueSource) => {
      if (val == null && option.presetArg !== undefined) {
        val = option.presetArg;
      }
      const oldValue = this.getOptionValue(name);
      if (val !== null && option.parseArg) {
        val = this._callParseArg(option, val, oldValue, invalidValueMessage);
      } else if (val !== null && option.variadic) {
        val = option._concatValue(val, oldValue);
      }
      if (val == null) {
        if (option.negate) {
          val = false;
        } else if (option.isBoolean() || option.optional) {
          val = true;
        } else {
          val = '';
        }
      }
      this.setOptionValueWithSource(name, val, valueSource);
    };
    this.on('option:' + oname, (val => {
      const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
      handleOptionValue(val, invalidValueMessage, 'cli');
    }));
    if (option.envVar) {
      this.on('optionEnv:' + oname, (val => {
        const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, 'env');
      }));
    }
    return this;
  }
  _optionEx(config, flags, description, fn, defaultValue) {
    if (typeof flags === 'object' && flags instanceof Option$2) {
      throw new Error('To add an Option object use addOption() instead of option() or requiredOption()');
    }
    const option = this.createOption(flags, description);
    option.makeOptionMandatory(!!config.mandatory);
    if (typeof fn === 'function') {
      option.default(defaultValue).argParser(fn);
    } else if (fn instanceof RegExp) {
      const regex = fn;
      fn = (val, def) => {
        const m = regex.exec(val);
        return m ? m[0] : def;
      };
      option.default(defaultValue).argParser(fn);
    } else {
      option.default(fn);
    }
    return this.addOption(option);
  }
  option(flags, description, parseArg, defaultValue) {
    return this._optionEx({}, flags, description, parseArg, defaultValue);
  }
  requiredOption(flags, description, parseArg, defaultValue) {
    return this._optionEx({
      mandatory: true
    }, flags, description, parseArg, defaultValue);
  }
  combineFlagAndOptionalValue(combine = true) {
    this._combineFlagAndOptionalValue = !!combine;
    return this;
  }
  allowUnknownOption(allowUnknown = true) {
    this._allowUnknownOption = !!allowUnknown;
    return this;
  }
  allowExcessArguments(allowExcess = true) {
    this._allowExcessArguments = !!allowExcess;
    return this;
  }
  enablePositionalOptions(positional = true) {
    this._enablePositionalOptions = !!positional;
    return this;
  }
  passThroughOptions(passThrough = true) {
    this._passThroughOptions = !!passThrough;
    this._checkForBrokenPassThrough();
    return this;
  }
  _checkForBrokenPassThrough() {
    if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
      throw new Error(`passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`);
    }
  }
  storeOptionsAsProperties(storeAsProperties = true) {
    if (this.options.length) {
      throw new Error('call .storeOptionsAsProperties() before adding options');
    }
    if (Object.keys(this._optionValues).length) {
      throw new Error('call .storeOptionsAsProperties() before setting option values');
    }
    this._storeOptionsAsProperties = !!storeAsProperties;
    return this;
  }
  getOptionValue(key) {
    if (this._storeOptionsAsProperties) {
      return this[key];
    }
    return this._optionValues[key];
  }
  setOptionValue(key, value) {
    return this.setOptionValueWithSource(key, value, undefined);
  }
  setOptionValueWithSource(key, value, source) {
    if (this._storeOptionsAsProperties) {
      this[key] = value;
    } else {
      this._optionValues[key] = value;
    }
    this._optionValueSources[key] = source;
    return this;
  }
  getOptionValueSource(key) {
    return this._optionValueSources[key];
  }
  getOptionValueSourceWithGlobals(key) {
    let source;
    this._getCommandAndAncestors().forEach((cmd => {
      if (cmd.getOptionValueSource(key) !== undefined) {
        source = cmd.getOptionValueSource(key);
      }
    }));
    return source;
  }
  _prepareUserArgs(argv, parseOptions) {
    if (argv !== undefined && !Array.isArray(argv)) {
      throw new Error('first parameter to parse must be array or undefined');
    }
    parseOptions = parseOptions || {};
    if (argv === undefined) {
      argv = process$1.argv;
      if (process$1.versions && process$1.versions.electron) {
        parseOptions.from = 'electron';
      }
    }
    this.rawArgs = argv.slice();
    let userArgs;
    switch (parseOptions.from) {
     case undefined:
     case 'node':
      this._scriptPath = argv[1];
      userArgs = argv.slice(2);
      break;

     case 'electron':
      if (process$1.defaultApp) {
        this._scriptPath = argv[1];
        userArgs = argv.slice(2);
      } else {
        userArgs = argv.slice(1);
      }
      break;

     case 'user':
      userArgs = argv.slice(0);
      break;

     default:
      throw new Error(`unexpected parse option { from: '${parseOptions.from}' }`);
    }
    if (!this._name && this._scriptPath) this.nameFromFilename(this._scriptPath);
    this._name = this._name || 'program';
    return userArgs;
  }
  parse(argv, parseOptions) {
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    this._parseCommand([], userArgs);
    return this;
  }
  async parseAsync(argv, parseOptions) {
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    await this._parseCommand([], userArgs);
    return this;
  }
  _executeSubCommand(subcommand, args) {
    args = args.slice();
    let launchWithNode = false;
    const sourceExt = [ '.js', '.ts', '.tsx', '.mjs', '.cjs' ];
    function findFile(baseDir, baseName) {
      const localBin = path$d.resolve(baseDir, baseName);
      if (fs$k.existsSync(localBin)) return localBin;
      if (sourceExt.includes(path$d.extname(baseName))) return undefined;
      const foundExt = sourceExt.find((ext => fs$k.existsSync(`${localBin}${ext}`)));
      if (foundExt) return `${localBin}${foundExt}`;
      return undefined;
    }
    this._checkForMissingMandatoryOptions();
    this._checkForConflictingOptions();
    let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
    let executableDir = this._executableDir || '';
    if (this._scriptPath) {
      let resolvedScriptPath;
      try {
        resolvedScriptPath = fs$k.realpathSync(this._scriptPath);
      } catch (err) {
        resolvedScriptPath = this._scriptPath;
      }
      executableDir = path$d.resolve(path$d.dirname(resolvedScriptPath), executableDir);
    }
    if (executableDir) {
      let localFile = findFile(executableDir, executableFile);
      if (!localFile && !subcommand._executableFile && this._scriptPath) {
        const legacyName = path$d.basename(this._scriptPath, path$d.extname(this._scriptPath));
        if (legacyName !== this._name) {
          localFile = findFile(executableDir, `${legacyName}-${subcommand._name}`);
        }
      }
      executableFile = localFile || executableFile;
    }
    launchWithNode = sourceExt.includes(path$d.extname(executableFile));
    let proc;
    if (process$1.platform !== 'win32') {
      if (launchWithNode) {
        args.unshift(executableFile);
        args = incrementNodeInspectorPort(process$1.execArgv).concat(args);
        proc = childProcess.spawn(process$1.argv[0], args, {
          stdio: 'inherit'
        });
      } else {
        proc = childProcess.spawn(executableFile, args, {
          stdio: 'inherit'
        });
      }
    } else {
      args.unshift(executableFile);
      args = incrementNodeInspectorPort(process$1.execArgv).concat(args);
      proc = childProcess.spawn(process$1.execPath, args, {
        stdio: 'inherit'
      });
    }
    if (!proc.killed) {
      const signals = [ 'SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP' ];
      signals.forEach((signal => {
        process$1.on(signal, (() => {
          if (proc.killed === false && proc.exitCode === null) {
            proc.kill(signal);
          }
        }));
      }));
    }
    const exitCallback = this._exitCallback;
    proc.on('close', ((code, _signal) => {
      code = code ?? 1;
      if (!exitCallback) {
        process$1.exit(code);
      } else {
        exitCallback(new CommanderError$2(code, 'commander.executeSubCommandAsync', '(close)'));
      }
    }));
    proc.on('error', (err => {
      if (err.code === 'ENOENT') {
        const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : 'no directory for search for local subcommand, use .executableDir() to supply a custom directory';
        const executableMissing = `'${executableFile}' does not exist\n - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead\n - if the default executable name is not suitable, use the executableFile option to supply a custom name or path\n - ${executableDirMessage}`;
        throw new Error(executableMissing);
      } else if (err.code === 'EACCES') {
        throw new Error(`'${executableFile}' not executable`);
      }
      if (!exitCallback) {
        process$1.exit(1);
      } else {
        const wrappedError = new CommanderError$2(1, 'commander.executeSubCommandAsync', '(error)');
        wrappedError.nestedError = err;
        exitCallback(wrappedError);
      }
    }));
    this.runningCommand = proc;
  }
  _dispatchSubcommand(commandName, operands, unknown) {
    const subCommand = this._findCommand(commandName);
    if (!subCommand) this.help({
      error: true
    });
    let promiseChain;
    promiseChain = this._chainOrCallSubCommandHook(promiseChain, subCommand, 'preSubcommand');
    promiseChain = this._chainOrCall(promiseChain, (() => {
      if (subCommand._executableHandler) {
        this._executeSubCommand(subCommand, operands.concat(unknown));
      } else {
        return subCommand._parseCommand(operands, unknown);
      }
    }));
    return promiseChain;
  }
  _dispatchHelpCommand(subcommandName) {
    if (!subcommandName) {
      this.help();
    }
    const subCommand = this._findCommand(subcommandName);
    if (subCommand && !subCommand._executableHandler) {
      subCommand.help();
    }
    return this._dispatchSubcommand(subcommandName, [], [ this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? '--help' ]);
  }
  _checkNumberOfArguments() {
    this.registeredArguments.forEach(((arg, i) => {
      if (arg.required && this.args[i] == null) {
        this.missingArgument(arg.name());
      }
    }));
    if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
      return;
    }
    if (this.args.length > this.registeredArguments.length) {
      this._excessArguments(this.args);
    }
  }
  _processArguments() {
    const myParseArg = (argument, value, previous) => {
      let parsedValue = value;
      if (value !== null && argument.parseArg) {
        const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
        parsedValue = this._callParseArg(argument, value, previous, invalidValueMessage);
      }
      return parsedValue;
    };
    this._checkNumberOfArguments();
    const processedArgs = [];
    this.registeredArguments.forEach(((declaredArg, index) => {
      let value = declaredArg.defaultValue;
      if (declaredArg.variadic) {
        if (index < this.args.length) {
          value = this.args.slice(index);
          if (declaredArg.parseArg) {
            value = value.reduce(((processed, v) => myParseArg(declaredArg, v, processed)), declaredArg.defaultValue);
          }
        } else if (value === undefined) {
          value = [];
        }
      } else if (index < this.args.length) {
        value = this.args[index];
        if (declaredArg.parseArg) {
          value = myParseArg(declaredArg, value, declaredArg.defaultValue);
        }
      }
      processedArgs[index] = value;
    }));
    this.processedArgs = processedArgs;
  }
  _chainOrCall(promise, fn) {
    if (promise && promise.then && typeof promise.then === 'function') {
      return promise.then((() => fn()));
    }
    return fn();
  }
  _chainOrCallHooks(promise, event) {
    let result = promise;
    const hooks = [];
    this._getCommandAndAncestors().reverse().filter((cmd => cmd._lifeCycleHooks[event] !== undefined)).forEach((hookedCommand => {
      hookedCommand._lifeCycleHooks[event].forEach((callback => {
        hooks.push({
          hookedCommand: hookedCommand,
          callback: callback
        });
      }));
    }));
    if (event === 'postAction') {
      hooks.reverse();
    }
    hooks.forEach((hookDetail => {
      result = this._chainOrCall(result, (() => hookDetail.callback(hookDetail.hookedCommand, this)));
    }));
    return result;
  }
  _chainOrCallSubCommandHook(promise, subCommand, event) {
    let result = promise;
    if (this._lifeCycleHooks[event] !== undefined) {
      this._lifeCycleHooks[event].forEach((hook => {
        result = this._chainOrCall(result, (() => hook(this, subCommand)));
      }));
    }
    return result;
  }
  _parseCommand(operands, unknown) {
    const parsed = this.parseOptions(unknown);
    this._parseOptionsEnv();
    this._parseOptionsImplied();
    operands = operands.concat(parsed.operands);
    unknown = parsed.unknown;
    this.args = operands.concat(unknown);
    if (operands && this._findCommand(operands[0])) {
      return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
    }
    if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
      return this._dispatchHelpCommand(operands[1]);
    }
    if (this._defaultCommandName) {
      this._outputHelpIfRequested(unknown);
      return this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
    }
    if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
      this.help({
        error: true
      });
    }
    this._outputHelpIfRequested(parsed.unknown);
    this._checkForMissingMandatoryOptions();
    this._checkForConflictingOptions();
    const checkForUnknownOptions = () => {
      if (parsed.unknown.length > 0) {
        this.unknownOption(parsed.unknown[0]);
      }
    };
    const commandEvent = `command:${this.name()}`;
    if (this._actionHandler) {
      checkForUnknownOptions();
      this._processArguments();
      let promiseChain;
      promiseChain = this._chainOrCallHooks(promiseChain, 'preAction');
      promiseChain = this._chainOrCall(promiseChain, (() => this._actionHandler(this.processedArgs)));
      if (this.parent) {
        promiseChain = this._chainOrCall(promiseChain, (() => {
          this.parent.emit(commandEvent, operands, unknown);
        }));
      }
      promiseChain = this._chainOrCallHooks(promiseChain, 'postAction');
      return promiseChain;
    }
    if (this.parent && this.parent.listenerCount(commandEvent)) {
      checkForUnknownOptions();
      this._processArguments();
      this.parent.emit(commandEvent, operands, unknown);
    } else if (operands.length) {
      if (this._findCommand('*')) {
        return this._dispatchSubcommand('*', operands, unknown);
      }
      if (this.listenerCount('command:*')) {
        this.emit('command:*', operands, unknown);
      } else if (this.commands.length) {
        this.unknownCommand();
      } else {
        checkForUnknownOptions();
        this._processArguments();
      }
    } else if (this.commands.length) {
      checkForUnknownOptions();
      this.help({
        error: true
      });
    } else {
      checkForUnknownOptions();
      this._processArguments();
    }
  }
  _findCommand(name) {
    if (!name) return undefined;
    return this.commands.find((cmd => cmd._name === name || cmd._aliases.includes(name)));
  }
  _findOption(arg) {
    return this.options.find((option => option.is(arg)));
  }
  _checkForMissingMandatoryOptions() {
    this._getCommandAndAncestors().forEach((cmd => {
      cmd.options.forEach((anOption => {
        if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === undefined) {
          cmd.missingMandatoryOptionValue(anOption);
        }
      }));
    }));
  }
  _checkForConflictingLocalOptions() {
    const definedNonDefaultOptions = this.options.filter((option => {
      const optionKey = option.attributeName();
      if (this.getOptionValue(optionKey) === undefined) {
        return false;
      }
      return this.getOptionValueSource(optionKey) !== 'default';
    }));
    const optionsWithConflicting = definedNonDefaultOptions.filter((option => option.conflictsWith.length > 0));
    optionsWithConflicting.forEach((option => {
      const conflictingAndDefined = definedNonDefaultOptions.find((defined => option.conflictsWith.includes(defined.attributeName())));
      if (conflictingAndDefined) {
        this._conflictingOption(option, conflictingAndDefined);
      }
    }));
  }
  _checkForConflictingOptions() {
    this._getCommandAndAncestors().forEach((cmd => {
      cmd._checkForConflictingLocalOptions();
    }));
  }
  parseOptions(argv) {
    const operands = [];
    const unknown = [];
    let dest = operands;
    const args = argv.slice();
    function maybeOption(arg) {
      return arg.length > 1 && arg[0] === '-';
    }
    let activeVariadicOption = null;
    while (args.length) {
      const arg = args.shift();
      if (arg === '--') {
        if (dest === unknown) dest.push(arg);
        dest.push(...args);
        break;
      }
      if (activeVariadicOption && !maybeOption(arg)) {
        this.emit(`option:${activeVariadicOption.name()}`, arg);
        continue;
      }
      activeVariadicOption = null;
      if (maybeOption(arg)) {
        const option = this._findOption(arg);
        if (option) {
          if (option.required) {
            const value = args.shift();
            if (value === undefined) this.optionMissingArgument(option);
            this.emit(`option:${option.name()}`, value);
          } else if (option.optional) {
            let value = null;
            if (args.length > 0 && !maybeOption(args[0])) {
              value = args.shift();
            }
            this.emit(`option:${option.name()}`, value);
          } else {
            this.emit(`option:${option.name()}`);
          }
          activeVariadicOption = option.variadic ? option : null;
          continue;
        }
      }
      if (arg.length > 2 && arg[0] === '-' && arg[1] !== '-') {
        const option = this._findOption(`-${arg[1]}`);
        if (option) {
          if (option.required || option.optional && this._combineFlagAndOptionalValue) {
            this.emit(`option:${option.name()}`, arg.slice(2));
          } else {
            this.emit(`option:${option.name()}`);
            args.unshift(`-${arg.slice(2)}`);
          }
          continue;
        }
      }
      if (/^--[^=]+=/.test(arg)) {
        const index = arg.indexOf('=');
        const option = this._findOption(arg.slice(0, index));
        if (option && (option.required || option.optional)) {
          this.emit(`option:${option.name()}`, arg.slice(index + 1));
          continue;
        }
      }
      if (maybeOption(arg)) {
        dest = unknown;
      }
      if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
        if (this._findCommand(arg)) {
          operands.push(arg);
          if (args.length > 0) unknown.push(...args);
          break;
        } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
          operands.push(arg);
          if (args.length > 0) operands.push(...args);
          break;
        } else if (this._defaultCommandName) {
          unknown.push(arg);
          if (args.length > 0) unknown.push(...args);
          break;
        }
      }
      if (this._passThroughOptions) {
        dest.push(arg);
        if (args.length > 0) dest.push(...args);
        break;
      }
      dest.push(arg);
    }
    return {
      operands: operands,
      unknown: unknown
    };
  }
  opts() {
    if (this._storeOptionsAsProperties) {
      const result = {};
      const len = this.options.length;
      for (let i = 0; i < len; i++) {
        const key = this.options[i].attributeName();
        result[key] = key === this._versionOptionName ? this._version : this[key];
      }
      return result;
    }
    return this._optionValues;
  }
  optsWithGlobals() {
    return this._getCommandAndAncestors().reduce(((combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts())), {});
  }
  error(message, errorOptions) {
    this._outputConfiguration.outputError(`${message}\n`, this._outputConfiguration.writeErr);
    if (typeof this._showHelpAfterError === 'string') {
      this._outputConfiguration.writeErr(`${this._showHelpAfterError}\n`);
    } else if (this._showHelpAfterError) {
      this._outputConfiguration.writeErr('\n');
      this.outputHelp({
        error: true
      });
    }
    const config = errorOptions || {};
    const exitCode = config.exitCode || 1;
    const code = config.code || 'commander.error';
    this._exit(exitCode, code, message);
  }
  _parseOptionsEnv() {
    this.options.forEach((option => {
      if (option.envVar && option.envVar in process$1.env) {
        const optionKey = option.attributeName();
        if (this.getOptionValue(optionKey) === undefined || [ 'default', 'config', 'env' ].includes(this.getOptionValueSource(optionKey))) {
          if (option.required || option.optional) {
            this.emit(`optionEnv:${option.name()}`, process$1.env[option.envVar]);
          } else {
            this.emit(`optionEnv:${option.name()}`);
          }
        }
      }
    }));
  }
  _parseOptionsImplied() {
    const dualHelper = new DualOptions(this.options);
    const hasCustomOptionValue = optionKey => this.getOptionValue(optionKey) !== undefined && ![ 'default', 'implied' ].includes(this.getOptionValueSource(optionKey));
    this.options.filter((option => option.implied !== undefined && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(this.getOptionValue(option.attributeName()), option))).forEach((option => {
      Object.keys(option.implied).filter((impliedKey => !hasCustomOptionValue(impliedKey))).forEach((impliedKey => {
        this.setOptionValueWithSource(impliedKey, option.implied[impliedKey], 'implied');
      }));
    }));
  }
  missingArgument(name) {
    const message = `error: missing required argument '${name}'`;
    this.error(message, {
      code: 'commander.missingArgument'
    });
  }
  optionMissingArgument(option) {
    const message = `error: option '${option.flags}' argument missing`;
    this.error(message, {
      code: 'commander.optionMissingArgument'
    });
  }
  missingMandatoryOptionValue(option) {
    const message = `error: required option '${option.flags}' not specified`;
    this.error(message, {
      code: 'commander.missingMandatoryOptionValue'
    });
  }
  _conflictingOption(option, conflictingOption) {
    const findBestOptionFromValue = option => {
      const optionKey = option.attributeName();
      const optionValue = this.getOptionValue(optionKey);
      const negativeOption = this.options.find((target => target.negate && optionKey === target.attributeName()));
      const positiveOption = this.options.find((target => !target.negate && optionKey === target.attributeName()));
      if (negativeOption && (negativeOption.presetArg === undefined && optionValue === false || negativeOption.presetArg !== undefined && optionValue === negativeOption.presetArg)) {
        return negativeOption;
      }
      return positiveOption || option;
    };
    const getErrorMessage = option => {
      const bestOption = findBestOptionFromValue(option);
      const optionKey = bestOption.attributeName();
      const source = this.getOptionValueSource(optionKey);
      if (source === 'env') {
        return `environment variable '${bestOption.envVar}'`;
      }
      return `option '${bestOption.flags}'`;
    };
    const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
    this.error(message, {
      code: 'commander.conflictingOption'
    });
  }
  unknownOption(flag) {
    if (this._allowUnknownOption) return;
    let suggestion = '';
    if (flag.startsWith('--') && this._showSuggestionAfterError) {
      let candidateFlags = [];
      let command = this;
      do {
        const moreFlags = command.createHelp().visibleOptions(command).filter((option => option.long)).map((option => option.long));
        candidateFlags = candidateFlags.concat(moreFlags);
        command = command.parent;
      } while (command && !command._enablePositionalOptions);
      suggestion = suggestSimilar(flag, candidateFlags);
    }
    const message = `error: unknown option '${flag}'${suggestion}`;
    this.error(message, {
      code: 'commander.unknownOption'
    });
  }
  _excessArguments(receivedArgs) {
    if (this._allowExcessArguments) return;
    const expected = this.registeredArguments.length;
    const s = expected === 1 ? '' : 's';
    const forSubcommand = this.parent ? ` for '${this.name()}'` : '';
    const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
    this.error(message, {
      code: 'commander.excessArguments'
    });
  }
  unknownCommand() {
    const unknownName = this.args[0];
    let suggestion = '';
    if (this._showSuggestionAfterError) {
      const candidateNames = [];
      this.createHelp().visibleCommands(this).forEach((command => {
        candidateNames.push(command.name());
        if (command.alias()) candidateNames.push(command.alias());
      }));
      suggestion = suggestSimilar(unknownName, candidateNames);
    }
    const message = `error: unknown command '${unknownName}'${suggestion}`;
    this.error(message, {
      code: 'commander.unknownCommand'
    });
  }
  version(str, flags, description) {
    if (str === undefined) return this._version;
    this._version = str;
    flags = flags || '-V, --version';
    description = description || 'output the version number';
    const versionOption = this.createOption(flags, description);
    this._versionOptionName = versionOption.attributeName();
    this._registerOption(versionOption);
    this.on('option:' + versionOption.name(), (() => {
      this._outputConfiguration.writeOut(`${str}\n`);
      this._exit(0, 'commander.version', str);
    }));
    return this;
  }
  description(str, argsDescription) {
    if (str === undefined && argsDescription === undefined) return this._description;
    this._description = str;
    if (argsDescription) {
      this._argsDescription = argsDescription;
    }
    return this;
  }
  summary(str) {
    if (str === undefined) return this._summary;
    this._summary = str;
    return this;
  }
  alias(alias) {
    if (alias === undefined) return this._aliases[0];
    let command = this;
    if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
      command = this.commands[this.commands.length - 1];
    }
    if (alias === command._name) throw new Error('Command alias can\'t be the same as its name');
    const matchingCommand = this.parent?._findCommand(alias);
    if (matchingCommand) {
      const existingCmd = [ matchingCommand.name() ].concat(matchingCommand.aliases()).join('|');
      throw new Error(`cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`);
    }
    command._aliases.push(alias);
    return this;
  }
  aliases(aliases) {
    if (aliases === undefined) return this._aliases;
    aliases.forEach((alias => this.alias(alias)));
    return this;
  }
  usage(str) {
    if (str === undefined) {
      if (this._usage) return this._usage;
      const args = this.registeredArguments.map((arg => humanReadableArgName(arg)));
      return [].concat(this.options.length || this._helpOption !== null ? '[options]' : [], this.commands.length ? '[command]' : [], this.registeredArguments.length ? args : []).join(' ');
    }
    this._usage = str;
    return this;
  }
  name(str) {
    if (str === undefined) return this._name;
    this._name = str;
    return this;
  }
  nameFromFilename(filename) {
    this._name = path$d.basename(filename, path$d.extname(filename));
    return this;
  }
  executableDir(path) {
    if (path === undefined) return this._executableDir;
    this._executableDir = path;
    return this;
  }
  helpInformation(contextOptions) {
    const helper = this.createHelp();
    if (helper.helpWidth === undefined) {
      helper.helpWidth = contextOptions && contextOptions.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
    }
    return helper.formatHelp(this, helper);
  }
  _getHelpContext(contextOptions) {
    contextOptions = contextOptions || {};
    const context = {
      error: !!contextOptions.error
    };
    let write;
    if (context.error) {
      write = arg => this._outputConfiguration.writeErr(arg);
    } else {
      write = arg => this._outputConfiguration.writeOut(arg);
    }
    context.write = contextOptions.write || write;
    context.command = this;
    return context;
  }
  outputHelp(contextOptions) {
    let deprecatedCallback;
    if (typeof contextOptions === 'function') {
      deprecatedCallback = contextOptions;
      contextOptions = undefined;
    }
    const context = this._getHelpContext(contextOptions);
    this._getCommandAndAncestors().reverse().forEach((command => command.emit('beforeAllHelp', context)));
    this.emit('beforeHelp', context);
    let helpInformation = this.helpInformation(context);
    if (deprecatedCallback) {
      helpInformation = deprecatedCallback(helpInformation);
      if (typeof helpInformation !== 'string' && !Buffer.isBuffer(helpInformation)) {
        throw new Error('outputHelp callback must return a string or a Buffer');
      }
    }
    context.write(helpInformation);
    if (this._getHelpOption()?.long) {
      this.emit(this._getHelpOption().long);
    }
    this.emit('afterHelp', context);
    this._getCommandAndAncestors().forEach((command => command.emit('afterAllHelp', context)));
  }
  helpOption(flags, description) {
    if (typeof flags === 'boolean') {
      if (flags) {
        this._helpOption = this._helpOption ?? undefined;
      } else {
        this._helpOption = null;
      }
      return this;
    }
    flags = flags ?? '-h, --help';
    description = description ?? 'display help for command';
    this._helpOption = this.createOption(flags, description);
    return this;
  }
  _getHelpOption() {
    if (this._helpOption === undefined) {
      this.helpOption(undefined, undefined);
    }
    return this._helpOption;
  }
  addHelpOption(option) {
    this._helpOption = option;
    return this;
  }
  help(contextOptions) {
    this.outputHelp(contextOptions);
    let exitCode = process$1.exitCode || 0;
    if (exitCode === 0 && contextOptions && typeof contextOptions !== 'function' && contextOptions.error) {
      exitCode = 1;
    }
    this._exit(exitCode, 'commander.help', '(outputHelp)');
  }
  addHelpText(position, text) {
    const allowedValues = [ 'beforeAll', 'before', 'after', 'afterAll' ];
    if (!allowedValues.includes(position)) {
      throw new Error(`Unexpected value for position to addHelpText.\nExpecting one of '${allowedValues.join('\', \'')}'`);
    }
    const helpEvent = `${position}Help`;
    this.on(helpEvent, (context => {
      let helpStr;
      if (typeof text === 'function') {
        helpStr = text({
          error: context.error,
          command: context.command
        });
      } else {
        helpStr = text;
      }
      if (helpStr) {
        context.write(`${helpStr}\n`);
      }
    }));
    return this;
  }
  _outputHelpIfRequested(args) {
    const helpOption = this._getHelpOption();
    const helpRequested = helpOption && args.find((arg => helpOption.is(arg)));
    if (helpRequested) {
      this.outputHelp();
      this._exit(0, 'commander.helpDisplayed', '(outputHelp)');
    }
  }
};

function incrementNodeInspectorPort(args) {
  return args.map((arg => {
    if (!arg.startsWith('--inspect')) {
      return arg;
    }
    let debugOption;
    let debugHost = '127.0.0.1';
    let debugPort = '9229';
    let match;
    if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
      debugOption = match[1];
    } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
      debugOption = match[1];
      if (/^\d+$/.test(match[3])) {
        debugPort = match[3];
      } else {
        debugHost = match[3];
      }
    } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
      debugOption = match[1];
      debugHost = match[3];
      debugPort = match[4];
    }
    if (debugOption && debugPort !== '0') {
      return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
    }
    return arg;
  }));
}

command.Command = Command$2;

const {Argument: Argument$1} = argument;

const {Command: Command$1} = command;

const {CommanderError: CommanderError$1, InvalidArgumentError: InvalidArgumentError$1} = error$2;

const {Help: Help$1} = help;

const {Option: Option$1} = option;

commander.program = new Command$1;

commander.createCommand = name => new Command$1(name);

commander.createOption = (flags, description) => new Option$1(flags, description);

commander.createArgument = (name, description) => new Argument$1(name, description);

commander.Command = Command$1;

commander.Option = Option$1;

commander.Argument = Argument$1;

commander.Help = Help$1;

commander.CommanderError = CommanderError$1;

commander.InvalidArgumentError = InvalidArgumentError$1;

commander.InvalidOptionArgumentError = InvalidArgumentError$1;

const {program: program$1, createCommand: createCommand, createArgument: createArgument, createOption: createOption, CommanderError: CommanderError, InvalidArgumentError: InvalidArgumentError, InvalidOptionArgumentError: InvalidOptionArgumentError, Command: Command, Argument: Argument, Option: Option, Help: Help} = commander;

var main$3 = {};

var is$2 = {};

Object.defineProperty(is$2, '__esModule', {
  value: true
});

is$2.thenable = is$2.typedArray = is$2.stringArray = is$2.array = is$2.func = is$2.error = is$2.number = is$2.string = is$2.boolean = void 0;

function boolean$1(value) {
  return value === true || value === false;
}

is$2.boolean = boolean$1;

function string$1(value) {
  return typeof value === 'string' || value instanceof String;
}

is$2.string = string$1;

function number$1(value) {
  return typeof value === 'number' || value instanceof Number;
}

is$2.number = number$1;

function error$1(value) {
  return value instanceof Error;
}

is$2.error = error$1;

function func$1(value) {
  return typeof value === 'function';
}

is$2.func = func$1;

function array$1(value) {
  return Array.isArray(value);
}

is$2.array = array$1;

function stringArray$1(value) {
  return array$1(value) && value.every((elem => string$1(elem)));
}

is$2.stringArray = stringArray$1;

function typedArray$1(value, check) {
  return Array.isArray(value) && value.every(check);
}

is$2.typedArray = typedArray$1;

function thenable(value) {
  return value && func$1(value.then);
}

is$2.thenable = thenable;

var server = {};

var main$2 = {};

var main$1 = {};

var ril = {};

var api$2 = {};

var messages$1 = {};

var is$1 = {};

var hasRequiredIs;

function requireIs() {
  if (hasRequiredIs) return is$1;
  hasRequiredIs = 1;
  Object.defineProperty(is$1, '__esModule', {
    value: true
  });
  is$1.stringArray = is$1.array = is$1.func = is$1.error = is$1.number = is$1.string = is$1.boolean = void 0;
  function boolean(value) {
    return value === true || value === false;
  }
  is$1.boolean = boolean;
  function string(value) {
    return typeof value === 'string' || value instanceof String;
  }
  is$1.string = string;
  function number(value) {
    return typeof value === 'number' || value instanceof Number;
  }
  is$1.number = number;
  function error(value) {
    return value instanceof Error;
  }
  is$1.error = error;
  function func(value) {
    return typeof value === 'function';
  }
  is$1.func = func;
  function array(value) {
    return Array.isArray(value);
  }
  is$1.array = array;
  function stringArray(value) {
    return array(value) && value.every((elem => string(elem)));
  }
  is$1.stringArray = stringArray;
  return is$1;
}

var hasRequiredMessages;

function requireMessages() {
  if (hasRequiredMessages) return messages$1;
  hasRequiredMessages = 1;
  Object.defineProperty(messages$1, '__esModule', {
    value: true
  });
  messages$1.Message = messages$1.NotificationType9 = messages$1.NotificationType8 = messages$1.NotificationType7 = messages$1.NotificationType6 = messages$1.NotificationType5 = messages$1.NotificationType4 = messages$1.NotificationType3 = messages$1.NotificationType2 = messages$1.NotificationType1 = messages$1.NotificationType0 = messages$1.NotificationType = messages$1.RequestType9 = messages$1.RequestType8 = messages$1.RequestType7 = messages$1.RequestType6 = messages$1.RequestType5 = messages$1.RequestType4 = messages$1.RequestType3 = messages$1.RequestType2 = messages$1.RequestType1 = messages$1.RequestType = messages$1.RequestType0 = messages$1.AbstractMessageSignature = messages$1.ParameterStructures = messages$1.ResponseError = messages$1.ErrorCodes = void 0;
  const is = requireIs();
  var ErrorCodes;
  (function(ErrorCodes) {
    ErrorCodes.ParseError = -32700;
    ErrorCodes.InvalidRequest = -32600;
    ErrorCodes.MethodNotFound = -32601;
    ErrorCodes.InvalidParams = -32602;
    ErrorCodes.InternalError = -32603;
    ErrorCodes.jsonrpcReservedErrorRangeStart = -32099;
    ErrorCodes.serverErrorStart = -32099;
    ErrorCodes.MessageWriteError = -32099;
    ErrorCodes.MessageReadError = -32098;
    ErrorCodes.PendingResponseRejected = -32097;
    ErrorCodes.ConnectionInactive = -32096;
    ErrorCodes.ServerNotInitialized = -32002;
    ErrorCodes.UnknownErrorCode = -32001;
    ErrorCodes.jsonrpcReservedErrorRangeEnd = -32e3;
    ErrorCodes.serverErrorEnd = -32e3;
  })(ErrorCodes || (messages$1.ErrorCodes = ErrorCodes = {}));
  class ResponseError extends Error {
    constructor(code, message, data) {
      super(message);
      this.code = is.number(code) ? code : ErrorCodes.UnknownErrorCode;
      this.data = data;
      Object.setPrototypeOf(this, ResponseError.prototype);
    }
    toJson() {
      const result = {
        code: this.code,
        message: this.message
      };
      if (this.data !== undefined) {
        result.data = this.data;
      }
      return result;
    }
  }
  messages$1.ResponseError = ResponseError;
  class ParameterStructures {
    constructor(kind) {
      this.kind = kind;
    }
    static is(value) {
      return value === ParameterStructures.auto || value === ParameterStructures.byName || value === ParameterStructures.byPosition;
    }
    toString() {
      return this.kind;
    }
  }
  messages$1.ParameterStructures = ParameterStructures;
  ParameterStructures.auto = new ParameterStructures('auto');
  ParameterStructures.byPosition = new ParameterStructures('byPosition');
  ParameterStructures.byName = new ParameterStructures('byName');
  class AbstractMessageSignature {
    constructor(method, numberOfParams) {
      this.method = method;
      this.numberOfParams = numberOfParams;
    }
    get parameterStructures() {
      return ParameterStructures.auto;
    }
  }
  messages$1.AbstractMessageSignature = AbstractMessageSignature;
  class RequestType0 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 0);
    }
  }
  messages$1.RequestType0 = RequestType0;
  class RequestType extends AbstractMessageSignature {
    constructor(method, _parameterStructures = ParameterStructures.auto) {
      super(method, 1);
      this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
      return this._parameterStructures;
    }
  }
  messages$1.RequestType = RequestType;
  class RequestType1 extends AbstractMessageSignature {
    constructor(method, _parameterStructures = ParameterStructures.auto) {
      super(method, 1);
      this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
      return this._parameterStructures;
    }
  }
  messages$1.RequestType1 = RequestType1;
  class RequestType2 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 2);
    }
  }
  messages$1.RequestType2 = RequestType2;
  class RequestType3 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 3);
    }
  }
  messages$1.RequestType3 = RequestType3;
  class RequestType4 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 4);
    }
  }
  messages$1.RequestType4 = RequestType4;
  class RequestType5 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 5);
    }
  }
  messages$1.RequestType5 = RequestType5;
  class RequestType6 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 6);
    }
  }
  messages$1.RequestType6 = RequestType6;
  class RequestType7 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 7);
    }
  }
  messages$1.RequestType7 = RequestType7;
  class RequestType8 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 8);
    }
  }
  messages$1.RequestType8 = RequestType8;
  class RequestType9 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 9);
    }
  }
  messages$1.RequestType9 = RequestType9;
  class NotificationType extends AbstractMessageSignature {
    constructor(method, _parameterStructures = ParameterStructures.auto) {
      super(method, 1);
      this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
      return this._parameterStructures;
    }
  }
  messages$1.NotificationType = NotificationType;
  class NotificationType0 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 0);
    }
  }
  messages$1.NotificationType0 = NotificationType0;
  class NotificationType1 extends AbstractMessageSignature {
    constructor(method, _parameterStructures = ParameterStructures.auto) {
      super(method, 1);
      this._parameterStructures = _parameterStructures;
    }
    get parameterStructures() {
      return this._parameterStructures;
    }
  }
  messages$1.NotificationType1 = NotificationType1;
  class NotificationType2 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 2);
    }
  }
  messages$1.NotificationType2 = NotificationType2;
  class NotificationType3 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 3);
    }
  }
  messages$1.NotificationType3 = NotificationType3;
  class NotificationType4 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 4);
    }
  }
  messages$1.NotificationType4 = NotificationType4;
  class NotificationType5 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 5);
    }
  }
  messages$1.NotificationType5 = NotificationType5;
  class NotificationType6 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 6);
    }
  }
  messages$1.NotificationType6 = NotificationType6;
  class NotificationType7 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 7);
    }
  }
  messages$1.NotificationType7 = NotificationType7;
  class NotificationType8 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 8);
    }
  }
  messages$1.NotificationType8 = NotificationType8;
  class NotificationType9 extends AbstractMessageSignature {
    constructor(method) {
      super(method, 9);
    }
  }
  messages$1.NotificationType9 = NotificationType9;
  var Message;
  (function(Message) {
    function isRequest(message) {
      const candidate = message;
      return candidate && is.string(candidate.method) && (is.string(candidate.id) || is.number(candidate.id));
    }
    Message.isRequest = isRequest;
    function isNotification(message) {
      const candidate = message;
      return candidate && is.string(candidate.method) && message.id === void 0;
    }
    Message.isNotification = isNotification;
    function isResponse(message) {
      const candidate = message;
      return candidate && (candidate.result !== void 0 || !!candidate.error) && (is.string(candidate.id) || is.number(candidate.id) || candidate.id === null);
    }
    Message.isResponse = isResponse;
  })(Message || (messages$1.Message = Message = {}));
  return messages$1;
}

var linkedMap = {};

var hasRequiredLinkedMap;

function requireLinkedMap() {
  if (hasRequiredLinkedMap) return linkedMap;
  hasRequiredLinkedMap = 1;
  var _a;
  Object.defineProperty(linkedMap, '__esModule', {
    value: true
  });
  linkedMap.LRUCache = linkedMap.LinkedMap = linkedMap.Touch = void 0;
  var Touch;
  (function(Touch) {
    Touch.None = 0;
    Touch.First = 1;
    Touch.AsOld = Touch.First;
    Touch.Last = 2;
    Touch.AsNew = Touch.Last;
  })(Touch || (linkedMap.Touch = Touch = {}));
  class LinkedMap {
    constructor() {
      this[_a] = 'LinkedMap';
      this._map = new Map;
      this._head = undefined;
      this._tail = undefined;
      this._size = 0;
      this._state = 0;
    }
    clear() {
      this._map.clear();
      this._head = undefined;
      this._tail = undefined;
      this._size = 0;
      this._state++;
    }
    isEmpty() {
      return !this._head && !this._tail;
    }
    get size() {
      return this._size;
    }
    get first() {
      return this._head?.value;
    }
    get last() {
      return this._tail?.value;
    }
    has(key) {
      return this._map.has(key);
    }
    get(key, touch = Touch.None) {
      const item = this._map.get(key);
      if (!item) {
        return undefined;
      }
      if (touch !== Touch.None) {
        this.touch(item, touch);
      }
      return item.value;
    }
    set(key, value, touch = Touch.None) {
      let item = this._map.get(key);
      if (item) {
        item.value = value;
        if (touch !== Touch.None) {
          this.touch(item, touch);
        }
      } else {
        item = {
          key: key,
          value: value,
          next: undefined,
          previous: undefined
        };
        switch (touch) {
         case Touch.None:
          this.addItemLast(item);
          break;

         case Touch.First:
          this.addItemFirst(item);
          break;

         case Touch.Last:
          this.addItemLast(item);
          break;

         default:
          this.addItemLast(item);
          break;
        }
        this._map.set(key, item);
        this._size++;
      }
      return this;
    }
    delete(key) {
      return !!this.remove(key);
    }
    remove(key) {
      const item = this._map.get(key);
      if (!item) {
        return undefined;
      }
      this._map.delete(key);
      this.removeItem(item);
      this._size--;
      return item.value;
    }
    shift() {
      if (!this._head && !this._tail) {
        return undefined;
      }
      if (!this._head || !this._tail) {
        throw new Error('Invalid list');
      }
      const item = this._head;
      this._map.delete(item.key);
      this.removeItem(item);
      this._size--;
      return item.value;
    }
    forEach(callbackfn, thisArg) {
      const state = this._state;
      let current = this._head;
      while (current) {
        if (thisArg) {
          callbackfn.bind(thisArg)(current.value, current.key, this);
        } else {
          callbackfn(current.value, current.key, this);
        }
        if (this._state !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        current = current.next;
      }
    }
    keys() {
      const state = this._state;
      let current = this._head;
      const iterator = {
        [Symbol.iterator]: () => iterator,
        next: () => {
          if (this._state !== state) {
            throw new Error(`LinkedMap got modified during iteration.`);
          }
          if (current) {
            const result = {
              value: current.key,
              done: false
            };
            current = current.next;
            return result;
          } else {
            return {
              value: undefined,
              done: true
            };
          }
        }
      };
      return iterator;
    }
    values() {
      const state = this._state;
      let current = this._head;
      const iterator = {
        [Symbol.iterator]: () => iterator,
        next: () => {
          if (this._state !== state) {
            throw new Error(`LinkedMap got modified during iteration.`);
          }
          if (current) {
            const result = {
              value: current.value,
              done: false
            };
            current = current.next;
            return result;
          } else {
            return {
              value: undefined,
              done: true
            };
          }
        }
      };
      return iterator;
    }
    entries() {
      const state = this._state;
      let current = this._head;
      const iterator = {
        [Symbol.iterator]: () => iterator,
        next: () => {
          if (this._state !== state) {
            throw new Error(`LinkedMap got modified during iteration.`);
          }
          if (current) {
            const result = {
              value: [ current.key, current.value ],
              done: false
            };
            current = current.next;
            return result;
          } else {
            return {
              value: undefined,
              done: true
            };
          }
        }
      };
      return iterator;
    }
    [(_a = Symbol.toStringTag, Symbol.iterator)]() {
      return this.entries();
    }
    trimOld(newSize) {
      if (newSize >= this.size) {
        return;
      }
      if (newSize === 0) {
        this.clear();
        return;
      }
      let current = this._head;
      let currentSize = this.size;
      while (current && currentSize > newSize) {
        this._map.delete(current.key);
        current = current.next;
        currentSize--;
      }
      this._head = current;
      this._size = currentSize;
      if (current) {
        current.previous = undefined;
      }
      this._state++;
    }
    addItemFirst(item) {
      if (!this._head && !this._tail) {
        this._tail = item;
      } else if (!this._head) {
        throw new Error('Invalid list');
      } else {
        item.next = this._head;
        this._head.previous = item;
      }
      this._head = item;
      this._state++;
    }
    addItemLast(item) {
      if (!this._head && !this._tail) {
        this._head = item;
      } else if (!this._tail) {
        throw new Error('Invalid list');
      } else {
        item.previous = this._tail;
        this._tail.next = item;
      }
      this._tail = item;
      this._state++;
    }
    removeItem(item) {
      if (item === this._head && item === this._tail) {
        this._head = undefined;
        this._tail = undefined;
      } else if (item === this._head) {
        if (!item.next) {
          throw new Error('Invalid list');
        }
        item.next.previous = undefined;
        this._head = item.next;
      } else if (item === this._tail) {
        if (!item.previous) {
          throw new Error('Invalid list');
        }
        item.previous.next = undefined;
        this._tail = item.previous;
      } else {
        const next = item.next;
        const previous = item.previous;
        if (!next || !previous) {
          throw new Error('Invalid list');
        }
        next.previous = previous;
        previous.next = next;
      }
      item.next = undefined;
      item.previous = undefined;
      this._state++;
    }
    touch(item, touch) {
      if (!this._head || !this._tail) {
        throw new Error('Invalid list');
      }
      if (touch !== Touch.First && touch !== Touch.Last) {
        return;
      }
      if (touch === Touch.First) {
        if (item === this._head) {
          return;
        }
        const next = item.next;
        const previous = item.previous;
        if (item === this._tail) {
          previous.next = undefined;
          this._tail = previous;
        } else {
          next.previous = previous;
          previous.next = next;
        }
        item.previous = undefined;
        item.next = this._head;
        this._head.previous = item;
        this._head = item;
        this._state++;
      } else if (touch === Touch.Last) {
        if (item === this._tail) {
          return;
        }
        const next = item.next;
        const previous = item.previous;
        if (item === this._head) {
          next.previous = undefined;
          this._head = next;
        } else {
          next.previous = previous;
          previous.next = next;
        }
        item.next = undefined;
        item.previous = this._tail;
        this._tail.next = item;
        this._tail = item;
        this._state++;
      }
    }
    toJSON() {
      const data = [];
      this.forEach(((value, key) => {
        data.push([ key, value ]);
      }));
      return data;
    }
    fromJSON(data) {
      this.clear();
      for (const [key, value] of data) {
        this.set(key, value);
      }
    }
  }
  linkedMap.LinkedMap = LinkedMap;
  class LRUCache extends LinkedMap {
    constructor(limit, ratio = 1) {
      super();
      this._limit = limit;
      this._ratio = Math.min(Math.max(0, ratio), 1);
    }
    get limit() {
      return this._limit;
    }
    set limit(limit) {
      this._limit = limit;
      this.checkTrim();
    }
    get ratio() {
      return this._ratio;
    }
    set ratio(ratio) {
      this._ratio = Math.min(Math.max(0, ratio), 1);
      this.checkTrim();
    }
    get(key, touch = Touch.AsNew) {
      return super.get(key, touch);
    }
    peek(key) {
      return super.get(key, Touch.None);
    }
    set(key, value) {
      super.set(key, value, Touch.Last);
      this.checkTrim();
      return this;
    }
    checkTrim() {
      if (this.size > this._limit) {
        this.trimOld(Math.round(this._limit * this._ratio));
      }
    }
  }
  linkedMap.LRUCache = LRUCache;
  return linkedMap;
}

var disposable = {};

var hasRequiredDisposable;

function requireDisposable() {
  if (hasRequiredDisposable) return disposable;
  hasRequiredDisposable = 1;
  Object.defineProperty(disposable, '__esModule', {
    value: true
  });
  disposable.Disposable = void 0;
  var Disposable;
  (function(Disposable) {
    function create(func) {
      return {
        dispose: func
      };
    }
    Disposable.create = create;
  })(Disposable || (disposable.Disposable = Disposable = {}));
  return disposable;
}

var events = {};

var ral = {};

var hasRequiredRal;

function requireRal() {
  if (hasRequiredRal) return ral;
  hasRequiredRal = 1;
  Object.defineProperty(ral, '__esModule', {
    value: true
  });
  let _ral;
  function RAL() {
    if (_ral === undefined) {
      throw new Error(`No runtime abstraction layer installed`);
    }
    return _ral;
  }
  (function(RAL) {
    function install(ral) {
      if (ral === undefined) {
        throw new Error(`No runtime abstraction layer provided`);
      }
      _ral = ral;
    }
    RAL.install = install;
  })(RAL || (RAL = {}));
  ral.default = RAL;
  return ral;
}

var hasRequiredEvents;

function requireEvents() {
  if (hasRequiredEvents) return events;
  hasRequiredEvents = 1;
  Object.defineProperty(events, '__esModule', {
    value: true
  });
  events.Emitter = events.Event = void 0;
  const ral_1 = requireRal();
  var Event;
  (function(Event) {
    const _disposable = {
      dispose() {}
    };
    Event.None = function() {
      return _disposable;
    };
  })(Event || (events.Event = Event = {}));
  class CallbackList {
    add(callback, context = null, bucket) {
      if (!this._callbacks) {
        this._callbacks = [];
        this._contexts = [];
      }
      this._callbacks.push(callback);
      this._contexts.push(context);
      if (Array.isArray(bucket)) {
        bucket.push({
          dispose: () => this.remove(callback, context)
        });
      }
    }
    remove(callback, context = null) {
      if (!this._callbacks) {
        return;
      }
      let foundCallbackWithDifferentContext = false;
      for (let i = 0, len = this._callbacks.length; i < len; i++) {
        if (this._callbacks[i] === callback) {
          if (this._contexts[i] === context) {
            this._callbacks.splice(i, 1);
            this._contexts.splice(i, 1);
            return;
          } else {
            foundCallbackWithDifferentContext = true;
          }
        }
      }
      if (foundCallbackWithDifferentContext) {
        throw new Error('When adding a listener with a context, you should remove it with the same context');
      }
    }
    invoke(...args) {
      if (!this._callbacks) {
        return [];
      }
      const ret = [], callbacks = this._callbacks.slice(0), contexts = this._contexts.slice(0);
      for (let i = 0, len = callbacks.length; i < len; i++) {
        try {
          ret.push(callbacks[i].apply(contexts[i], args));
        } catch (e) {
          (0, ral_1.default)().console.error(e);
        }
      }
      return ret;
    }
    isEmpty() {
      return !this._callbacks || this._callbacks.length === 0;
    }
    dispose() {
      this._callbacks = undefined;
      this._contexts = undefined;
    }
  }
  class Emitter {
    constructor(_options) {
      this._options = _options;
    }
    get event() {
      if (!this._event) {
        this._event = (listener, thisArgs, disposables) => {
          if (!this._callbacks) {
            this._callbacks = new CallbackList;
          }
          if (this._options && this._options.onFirstListenerAdd && this._callbacks.isEmpty()) {
            this._options.onFirstListenerAdd(this);
          }
          this._callbacks.add(listener, thisArgs);
          const result = {
            dispose: () => {
              if (!this._callbacks) {
                return;
              }
              this._callbacks.remove(listener, thisArgs);
              result.dispose = Emitter._noop;
              if (this._options && this._options.onLastListenerRemove && this._callbacks.isEmpty()) {
                this._options.onLastListenerRemove(this);
              }
            }
          };
          if (Array.isArray(disposables)) {
            disposables.push(result);
          }
          return result;
        };
      }
      return this._event;
    }
    fire(event) {
      if (this._callbacks) {
        this._callbacks.invoke.call(this._callbacks, event);
      }
    }
    dispose() {
      if (this._callbacks) {
        this._callbacks.dispose();
        this._callbacks = undefined;
      }
    }
  }
  events.Emitter = Emitter;
  Emitter._noop = function() {};
  return events;
}

var cancellation = {};

var hasRequiredCancellation;

function requireCancellation() {
  if (hasRequiredCancellation) return cancellation;
  hasRequiredCancellation = 1;
  Object.defineProperty(cancellation, '__esModule', {
    value: true
  });
  cancellation.CancellationTokenSource = cancellation.CancellationToken = void 0;
  const ral_1 = requireRal();
  const Is = requireIs();
  const events_1 = requireEvents();
  var CancellationToken;
  (function(CancellationToken) {
    CancellationToken.None = Object.freeze({
      isCancellationRequested: false,
      onCancellationRequested: events_1.Event.None
    });
    CancellationToken.Cancelled = Object.freeze({
      isCancellationRequested: true,
      onCancellationRequested: events_1.Event.None
    });
    function is(value) {
      const candidate = value;
      return candidate && (candidate === CancellationToken.None || candidate === CancellationToken.Cancelled || Is.boolean(candidate.isCancellationRequested) && !!candidate.onCancellationRequested);
    }
    CancellationToken.is = is;
  })(CancellationToken || (cancellation.CancellationToken = CancellationToken = {}));
  const shortcutEvent = Object.freeze((function(callback, context) {
    const handle = (0, ral_1.default)().timer.setTimeout(callback.bind(context), 0);
    return {
      dispose() {
        handle.dispose();
      }
    };
  }));
  class MutableToken {
    constructor() {
      this._isCancelled = false;
    }
    cancel() {
      if (!this._isCancelled) {
        this._isCancelled = true;
        if (this._emitter) {
          this._emitter.fire(undefined);
          this.dispose();
        }
      }
    }
    get isCancellationRequested() {
      return this._isCancelled;
    }
    get onCancellationRequested() {
      if (this._isCancelled) {
        return shortcutEvent;
      }
      if (!this._emitter) {
        this._emitter = new events_1.Emitter;
      }
      return this._emitter.event;
    }
    dispose() {
      if (this._emitter) {
        this._emitter.dispose();
        this._emitter = undefined;
      }
    }
  }
  class CancellationTokenSource {
    get token() {
      if (!this._token) {
        this._token = new MutableToken;
      }
      return this._token;
    }
    cancel() {
      if (!this._token) {
        this._token = CancellationToken.Cancelled;
      } else {
        this._token.cancel();
      }
    }
    dispose() {
      if (!this._token) {
        this._token = CancellationToken.None;
      } else if (this._token instanceof MutableToken) {
        this._token.dispose();
      }
    }
  }
  cancellation.CancellationTokenSource = CancellationTokenSource;
  return cancellation;
}

var sharedArrayCancellation = {};

var hasRequiredSharedArrayCancellation;

function requireSharedArrayCancellation() {
  if (hasRequiredSharedArrayCancellation) return sharedArrayCancellation;
  hasRequiredSharedArrayCancellation = 1;
  Object.defineProperty(sharedArrayCancellation, '__esModule', {
    value: true
  });
  sharedArrayCancellation.SharedArrayReceiverStrategy = sharedArrayCancellation.SharedArraySenderStrategy = void 0;
  const cancellation_1 = requireCancellation();
  var CancellationState;
  (function(CancellationState) {
    CancellationState.Continue = 0;
    CancellationState.Cancelled = 1;
  })(CancellationState || (CancellationState = {}));
  class SharedArraySenderStrategy {
    constructor() {
      this.buffers = new Map;
    }
    enableCancellation(request) {
      if (request.id === null) {
        return;
      }
      const buffer = new SharedArrayBuffer(4);
      const data = new Int32Array(buffer, 0, 1);
      data[0] = CancellationState.Continue;
      this.buffers.set(request.id, buffer);
      request.$cancellationData = buffer;
    }
    async sendCancellation(_conn, id) {
      const buffer = this.buffers.get(id);
      if (buffer === undefined) {
        return;
      }
      const data = new Int32Array(buffer, 0, 1);
      Atomics.store(data, 0, CancellationState.Cancelled);
    }
    cleanup(id) {
      this.buffers.delete(id);
    }
    dispose() {
      this.buffers.clear();
    }
  }
  sharedArrayCancellation.SharedArraySenderStrategy = SharedArraySenderStrategy;
  class SharedArrayBufferCancellationToken {
    constructor(buffer) {
      this.data = new Int32Array(buffer, 0, 1);
    }
    get isCancellationRequested() {
      return Atomics.load(this.data, 0) === CancellationState.Cancelled;
    }
    get onCancellationRequested() {
      throw new Error(`Cancellation over SharedArrayBuffer doesn't support cancellation events`);
    }
  }
  class SharedArrayBufferCancellationTokenSource {
    constructor(buffer) {
      this.token = new SharedArrayBufferCancellationToken(buffer);
    }
    cancel() {}
    dispose() {}
  }
  class SharedArrayReceiverStrategy {
    constructor() {
      this.kind = 'request';
    }
    createCancellationTokenSource(request) {
      const buffer = request.$cancellationData;
      if (buffer === undefined) {
        return new cancellation_1.CancellationTokenSource;
      }
      return new SharedArrayBufferCancellationTokenSource(buffer);
    }
  }
  sharedArrayCancellation.SharedArrayReceiverStrategy = SharedArrayReceiverStrategy;
  return sharedArrayCancellation;
}

var messageReader = {};

var semaphore = {};

var hasRequiredSemaphore;

function requireSemaphore() {
  if (hasRequiredSemaphore) return semaphore;
  hasRequiredSemaphore = 1;
  Object.defineProperty(semaphore, '__esModule', {
    value: true
  });
  semaphore.Semaphore = void 0;
  const ral_1 = requireRal();
  class Semaphore {
    constructor(capacity = 1) {
      if (capacity <= 0) {
        throw new Error('Capacity must be greater than 0');
      }
      this._capacity = capacity;
      this._active = 0;
      this._waiting = [];
    }
    lock(thunk) {
      return new Promise(((resolve, reject) => {
        this._waiting.push({
          thunk: thunk,
          resolve: resolve,
          reject: reject
        });
        this.runNext();
      }));
    }
    get active() {
      return this._active;
    }
    runNext() {
      if (this._waiting.length === 0 || this._active === this._capacity) {
        return;
      }
      (0, ral_1.default)().timer.setImmediate((() => this.doRunNext()));
    }
    doRunNext() {
      if (this._waiting.length === 0 || this._active === this._capacity) {
        return;
      }
      const next = this._waiting.shift();
      this._active++;
      if (this._active > this._capacity) {
        throw new Error(`To many thunks active`);
      }
      try {
        const result = next.thunk();
        if (result instanceof Promise) {
          result.then((value => {
            this._active--;
            next.resolve(value);
            this.runNext();
          }), (err => {
            this._active--;
            next.reject(err);
            this.runNext();
          }));
        } else {
          this._active--;
          next.resolve(result);
          this.runNext();
        }
      } catch (err) {
        this._active--;
        next.reject(err);
        this.runNext();
      }
    }
  }
  semaphore.Semaphore = Semaphore;
  return semaphore;
}

var hasRequiredMessageReader;

function requireMessageReader() {
  if (hasRequiredMessageReader) return messageReader;
  hasRequiredMessageReader = 1;
  Object.defineProperty(messageReader, '__esModule', {
    value: true
  });
  messageReader.ReadableStreamMessageReader = messageReader.AbstractMessageReader = messageReader.MessageReader = void 0;
  const ral_1 = requireRal();
  const Is = requireIs();
  const events_1 = requireEvents();
  const semaphore_1 = requireSemaphore();
  var MessageReader;
  (function(MessageReader) {
    function is(value) {
      let candidate = value;
      return candidate && Is.func(candidate.listen) && Is.func(candidate.dispose) && Is.func(candidate.onError) && Is.func(candidate.onClose) && Is.func(candidate.onPartialMessage);
    }
    MessageReader.is = is;
  })(MessageReader || (messageReader.MessageReader = MessageReader = {}));
  class AbstractMessageReader {
    constructor() {
      this.errorEmitter = new events_1.Emitter;
      this.closeEmitter = new events_1.Emitter;
      this.partialMessageEmitter = new events_1.Emitter;
    }
    dispose() {
      this.errorEmitter.dispose();
      this.closeEmitter.dispose();
    }
    get onError() {
      return this.errorEmitter.event;
    }
    fireError(error) {
      this.errorEmitter.fire(this.asError(error));
    }
    get onClose() {
      return this.closeEmitter.event;
    }
    fireClose() {
      this.closeEmitter.fire(undefined);
    }
    get onPartialMessage() {
      return this.partialMessageEmitter.event;
    }
    firePartialMessage(info) {
      this.partialMessageEmitter.fire(info);
    }
    asError(error) {
      if (error instanceof Error) {
        return error;
      } else {
        return new Error(`Reader received error. Reason: ${Is.string(error.message) ? error.message : 'unknown'}`);
      }
    }
  }
  messageReader.AbstractMessageReader = AbstractMessageReader;
  var ResolvedMessageReaderOptions;
  (function(ResolvedMessageReaderOptions) {
    function fromOptions(options) {
      let charset;
      let contentDecoder;
      const contentDecoders = new Map;
      let contentTypeDecoder;
      const contentTypeDecoders = new Map;
      if (options === undefined || typeof options === 'string') {
        charset = options ?? 'utf-8';
      } else {
        charset = options.charset ?? 'utf-8';
        if (options.contentDecoder !== undefined) {
          contentDecoder = options.contentDecoder;
          contentDecoders.set(contentDecoder.name, contentDecoder);
        }
        if (options.contentDecoders !== undefined) {
          for (const decoder of options.contentDecoders) {
            contentDecoders.set(decoder.name, decoder);
          }
        }
        if (options.contentTypeDecoder !== undefined) {
          contentTypeDecoder = options.contentTypeDecoder;
          contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
        }
        if (options.contentTypeDecoders !== undefined) {
          for (const decoder of options.contentTypeDecoders) {
            contentTypeDecoders.set(decoder.name, decoder);
          }
        }
      }
      if (contentTypeDecoder === undefined) {
        contentTypeDecoder = (0, ral_1.default)().applicationJson.decoder;
        contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
      }
      return {
        charset: charset,
        contentDecoder: contentDecoder,
        contentDecoders: contentDecoders,
        contentTypeDecoder: contentTypeDecoder,
        contentTypeDecoders: contentTypeDecoders
      };
    }
    ResolvedMessageReaderOptions.fromOptions = fromOptions;
  })(ResolvedMessageReaderOptions || (ResolvedMessageReaderOptions = {}));
  class ReadableStreamMessageReader extends AbstractMessageReader {
    constructor(readable, options) {
      super();
      this.readable = readable;
      this.options = ResolvedMessageReaderOptions.fromOptions(options);
      this.buffer = (0, ral_1.default)().messageBuffer.create(this.options.charset);
      this._partialMessageTimeout = 1e4;
      this.nextMessageLength = -1;
      this.messageToken = 0;
      this.readSemaphore = new semaphore_1.Semaphore(1);
    }
    set partialMessageTimeout(timeout) {
      this._partialMessageTimeout = timeout;
    }
    get partialMessageTimeout() {
      return this._partialMessageTimeout;
    }
    listen(callback) {
      this.nextMessageLength = -1;
      this.messageToken = 0;
      this.partialMessageTimer = undefined;
      this.callback = callback;
      const result = this.readable.onData((data => {
        this.onData(data);
      }));
      this.readable.onError((error => this.fireError(error)));
      this.readable.onClose((() => this.fireClose()));
      return result;
    }
    onData(data) {
      try {
        this.buffer.append(data);
        while (true) {
          if (this.nextMessageLength === -1) {
            const headers = this.buffer.tryReadHeaders(true);
            if (!headers) {
              return;
            }
            const contentLength = headers.get('content-length');
            if (!contentLength) {
              this.fireError(new Error(`Header must provide a Content-Length property.\n${JSON.stringify(Object.fromEntries(headers))}`));
              return;
            }
            const length = parseInt(contentLength);
            if (isNaN(length)) {
              this.fireError(new Error(`Content-Length value must be a number. Got ${contentLength}`));
              return;
            }
            this.nextMessageLength = length;
          }
          const body = this.buffer.tryReadBody(this.nextMessageLength);
          if (body === undefined) {
            this.setPartialMessageTimer();
            return;
          }
          this.clearPartialMessageTimer();
          this.nextMessageLength = -1;
          this.readSemaphore.lock((async () => {
            const bytes = this.options.contentDecoder !== undefined ? await this.options.contentDecoder.decode(body) : body;
            const message = await this.options.contentTypeDecoder.decode(bytes, this.options);
            this.callback(message);
          })).catch((error => {
            this.fireError(error);
          }));
        }
      } catch (error) {
        this.fireError(error);
      }
    }
    clearPartialMessageTimer() {
      if (this.partialMessageTimer) {
        this.partialMessageTimer.dispose();
        this.partialMessageTimer = undefined;
      }
    }
    setPartialMessageTimer() {
      this.clearPartialMessageTimer();
      if (this._partialMessageTimeout <= 0) {
        return;
      }
      this.partialMessageTimer = (0, ral_1.default)().timer.setTimeout(((token, timeout) => {
        this.partialMessageTimer = undefined;
        if (token === this.messageToken) {
          this.firePartialMessage({
            messageToken: token,
            waitingTime: timeout
          });
          this.setPartialMessageTimer();
        }
      }), this._partialMessageTimeout, this.messageToken, this._partialMessageTimeout);
    }
  }
  messageReader.ReadableStreamMessageReader = ReadableStreamMessageReader;
  return messageReader;
}

var messageWriter = {};

var hasRequiredMessageWriter;

function requireMessageWriter() {
  if (hasRequiredMessageWriter) return messageWriter;
  hasRequiredMessageWriter = 1;
  Object.defineProperty(messageWriter, '__esModule', {
    value: true
  });
  messageWriter.WriteableStreamMessageWriter = messageWriter.AbstractMessageWriter = messageWriter.MessageWriter = void 0;
  const ral_1 = requireRal();
  const Is = requireIs();
  const semaphore_1 = requireSemaphore();
  const events_1 = requireEvents();
  const ContentLength = 'Content-Length: ';
  const CRLF = '\r\n';
  var MessageWriter;
  (function(MessageWriter) {
    function is(value) {
      let candidate = value;
      return candidate && Is.func(candidate.dispose) && Is.func(candidate.onClose) && Is.func(candidate.onError) && Is.func(candidate.write);
    }
    MessageWriter.is = is;
  })(MessageWriter || (messageWriter.MessageWriter = MessageWriter = {}));
  class AbstractMessageWriter {
    constructor() {
      this.errorEmitter = new events_1.Emitter;
      this.closeEmitter = new events_1.Emitter;
    }
    dispose() {
      this.errorEmitter.dispose();
      this.closeEmitter.dispose();
    }
    get onError() {
      return this.errorEmitter.event;
    }
    fireError(error, message, count) {
      this.errorEmitter.fire([ this.asError(error), message, count ]);
    }
    get onClose() {
      return this.closeEmitter.event;
    }
    fireClose() {
      this.closeEmitter.fire(undefined);
    }
    asError(error) {
      if (error instanceof Error) {
        return error;
      } else {
        return new Error(`Writer received error. Reason: ${Is.string(error.message) ? error.message : 'unknown'}`);
      }
    }
  }
  messageWriter.AbstractMessageWriter = AbstractMessageWriter;
  var ResolvedMessageWriterOptions;
  (function(ResolvedMessageWriterOptions) {
    function fromOptions(options) {
      if (options === undefined || typeof options === 'string') {
        return {
          charset: options ?? 'utf-8',
          contentTypeEncoder: (0, ral_1.default)().applicationJson.encoder
        };
      } else {
        return {
          charset: options.charset ?? 'utf-8',
          contentEncoder: options.contentEncoder,
          contentTypeEncoder: options.contentTypeEncoder ?? (0, ral_1.default)().applicationJson.encoder
        };
      }
    }
    ResolvedMessageWriterOptions.fromOptions = fromOptions;
  })(ResolvedMessageWriterOptions || (ResolvedMessageWriterOptions = {}));
  class WriteableStreamMessageWriter extends AbstractMessageWriter {
    constructor(writable, options) {
      super();
      this.writable = writable;
      this.options = ResolvedMessageWriterOptions.fromOptions(options);
      this.errorCount = 0;
      this.writeSemaphore = new semaphore_1.Semaphore(1);
      this.writable.onError((error => this.fireError(error)));
      this.writable.onClose((() => this.fireClose()));
    }
    async write(msg) {
      return this.writeSemaphore.lock((async () => {
        const payload = this.options.contentTypeEncoder.encode(msg, this.options).then((buffer => {
          if (this.options.contentEncoder !== undefined) {
            return this.options.contentEncoder.encode(buffer);
          } else {
            return buffer;
          }
        }));
        return payload.then((buffer => {
          const headers = [];
          headers.push(ContentLength, buffer.byteLength.toString(), CRLF);
          headers.push(CRLF);
          return this.doWrite(msg, headers, buffer);
        }), (error => {
          this.fireError(error);
          throw error;
        }));
      }));
    }
    async doWrite(msg, headers, data) {
      try {
        await this.writable.write(headers.join(''), 'ascii');
        return this.writable.write(data);
      } catch (error) {
        this.handleError(error, msg);
        return Promise.reject(error);
      }
    }
    handleError(error, msg) {
      this.errorCount++;
      this.fireError(error, msg, this.errorCount);
    }
    end() {
      this.writable.end();
    }
  }
  messageWriter.WriteableStreamMessageWriter = WriteableStreamMessageWriter;
  return messageWriter;
}

var messageBuffer = {};

var hasRequiredMessageBuffer;

function requireMessageBuffer() {
  if (hasRequiredMessageBuffer) return messageBuffer;
  hasRequiredMessageBuffer = 1;
  Object.defineProperty(messageBuffer, '__esModule', {
    value: true
  });
  messageBuffer.AbstractMessageBuffer = void 0;
  const CR = 13;
  const LF = 10;
  const CRLF = '\r\n';
  class AbstractMessageBuffer {
    constructor(encoding = 'utf-8') {
      this._encoding = encoding;
      this._chunks = [];
      this._totalLength = 0;
    }
    get encoding() {
      return this._encoding;
    }
    append(chunk) {
      const toAppend = typeof chunk === 'string' ? this.fromString(chunk, this._encoding) : chunk;
      this._chunks.push(toAppend);
      this._totalLength += toAppend.byteLength;
    }
    tryReadHeaders(lowerCaseKeys = false) {
      if (this._chunks.length === 0) {
        return undefined;
      }
      let state = 0;
      let chunkIndex = 0;
      let offset = 0;
      let chunkBytesRead = 0;
      row: while (chunkIndex < this._chunks.length) {
        const chunk = this._chunks[chunkIndex];
        offset = 0;
        while (offset < chunk.length) {
          const value = chunk[offset];
          switch (value) {
           case CR:
            switch (state) {
             case 0:
              state = 1;
              break;

             case 2:
              state = 3;
              break;

             default:
              state = 0;
            }
            break;

           case LF:
            switch (state) {
             case 1:
              state = 2;
              break;

             case 3:
              state = 4;
              offset++;
              break row;

             default:
              state = 0;
            }
            break;

           default:
            state = 0;
          }
          offset++;
        }
        chunkBytesRead += chunk.byteLength;
        chunkIndex++;
      }
      if (state !== 4) {
        return undefined;
      }
      const buffer = this._read(chunkBytesRead + offset);
      const result = new Map;
      const headers = this.toString(buffer, 'ascii').split(CRLF);
      if (headers.length < 2) {
        return result;
      }
      for (let i = 0; i < headers.length - 2; i++) {
        const header = headers[i];
        const index = header.indexOf(':');
        if (index === -1) {
          throw new Error(`Message header must separate key and value using ':'\n${header}`);
        }
        const key = header.substr(0, index);
        const value = header.substr(index + 1).trim();
        result.set(lowerCaseKeys ? key.toLowerCase() : key, value);
      }
      return result;
    }
    tryReadBody(length) {
      if (this._totalLength < length) {
        return undefined;
      }
      return this._read(length);
    }
    get numberOfBytes() {
      return this._totalLength;
    }
    _read(byteCount) {
      if (byteCount === 0) {
        return this.emptyBuffer();
      }
      if (byteCount > this._totalLength) {
        throw new Error(`Cannot read so many bytes!`);
      }
      if (this._chunks[0].byteLength === byteCount) {
        const chunk = this._chunks[0];
        this._chunks.shift();
        this._totalLength -= byteCount;
        return this.asNative(chunk);
      }
      if (this._chunks[0].byteLength > byteCount) {
        const chunk = this._chunks[0];
        const result = this.asNative(chunk, byteCount);
        this._chunks[0] = chunk.slice(byteCount);
        this._totalLength -= byteCount;
        return result;
      }
      const result = this.allocNative(byteCount);
      let resultOffset = 0;
      let chunkIndex = 0;
      while (byteCount > 0) {
        const chunk = this._chunks[chunkIndex];
        if (chunk.byteLength > byteCount) {
          const chunkPart = chunk.slice(0, byteCount);
          result.set(chunkPart, resultOffset);
          resultOffset += byteCount;
          this._chunks[chunkIndex] = chunk.slice(byteCount);
          this._totalLength -= byteCount;
          byteCount -= byteCount;
        } else {
          result.set(chunk, resultOffset);
          resultOffset += chunk.byteLength;
          this._chunks.shift();
          this._totalLength -= chunk.byteLength;
          byteCount -= chunk.byteLength;
        }
      }
      return result;
    }
  }
  messageBuffer.AbstractMessageBuffer = AbstractMessageBuffer;
  return messageBuffer;
}

var connection$1 = {};

var hasRequiredConnection;

function requireConnection() {
  if (hasRequiredConnection) return connection$1;
  hasRequiredConnection = 1;
  (function(exports) {
    Object.defineProperty(exports, '__esModule', {
      value: true
    });
    exports.createMessageConnection = exports.ConnectionOptions = exports.MessageStrategy = exports.CancellationStrategy = exports.CancellationSenderStrategy = exports.CancellationReceiverStrategy = exports.RequestCancellationReceiverStrategy = exports.IdCancellationReceiverStrategy = exports.ConnectionStrategy = exports.ConnectionError = exports.ConnectionErrors = exports.LogTraceNotification = exports.SetTraceNotification = exports.TraceFormat = exports.TraceValues = exports.Trace = exports.NullLogger = exports.ProgressType = exports.ProgressToken = void 0;
    const ral_1 = requireRal();
    const Is = requireIs();
    const messages_1 = requireMessages();
    const linkedMap_1 = requireLinkedMap();
    const events_1 = requireEvents();
    const cancellation_1 = requireCancellation();
    var CancelNotification;
    (function(CancelNotification) {
      CancelNotification.type = new messages_1.NotificationType('$/cancelRequest');
    })(CancelNotification || (CancelNotification = {}));
    var ProgressToken;
    (function(ProgressToken) {
      function is(value) {
        return typeof value === 'string' || typeof value === 'number';
      }
      ProgressToken.is = is;
    })(ProgressToken || (exports.ProgressToken = ProgressToken = {}));
    var ProgressNotification;
    (function(ProgressNotification) {
      ProgressNotification.type = new messages_1.NotificationType('$/progress');
    })(ProgressNotification || (ProgressNotification = {}));
    class ProgressType {
      constructor() {}
    }
    exports.ProgressType = ProgressType;
    var StarRequestHandler;
    (function(StarRequestHandler) {
      function is(value) {
        return Is.func(value);
      }
      StarRequestHandler.is = is;
    })(StarRequestHandler || (StarRequestHandler = {}));
    exports.NullLogger = Object.freeze({
      error: () => {},
      warn: () => {},
      info: () => {},
      log: () => {}
    });
    var Trace;
    (function(Trace) {
      Trace[Trace['Off'] = 0] = 'Off';
      Trace[Trace['Messages'] = 1] = 'Messages';
      Trace[Trace['Compact'] = 2] = 'Compact';
      Trace[Trace['Verbose'] = 3] = 'Verbose';
    })(Trace || (exports.Trace = Trace = {}));
    var TraceValues;
    (function(TraceValues) {
      TraceValues.Off = 'off';
      TraceValues.Messages = 'messages';
      TraceValues.Compact = 'compact';
      TraceValues.Verbose = 'verbose';
    })(TraceValues || (exports.TraceValues = TraceValues = {}));
    (function(Trace) {
      function fromString(value) {
        if (!Is.string(value)) {
          return Trace.Off;
        }
        value = value.toLowerCase();
        switch (value) {
         case 'off':
          return Trace.Off;

         case 'messages':
          return Trace.Messages;

         case 'compact':
          return Trace.Compact;

         case 'verbose':
          return Trace.Verbose;

         default:
          return Trace.Off;
        }
      }
      Trace.fromString = fromString;
      function toString(value) {
        switch (value) {
         case Trace.Off:
          return 'off';

         case Trace.Messages:
          return 'messages';

         case Trace.Compact:
          return 'compact';

         case Trace.Verbose:
          return 'verbose';

         default:
          return 'off';
        }
      }
      Trace.toString = toString;
    })(Trace || (exports.Trace = Trace = {}));
    var TraceFormat;
    (function(TraceFormat) {
      TraceFormat['Text'] = 'text';
      TraceFormat['JSON'] = 'json';
    })(TraceFormat || (exports.TraceFormat = TraceFormat = {}));
    (function(TraceFormat) {
      function fromString(value) {
        if (!Is.string(value)) {
          return TraceFormat.Text;
        }
        value = value.toLowerCase();
        if (value === 'json') {
          return TraceFormat.JSON;
        } else {
          return TraceFormat.Text;
        }
      }
      TraceFormat.fromString = fromString;
    })(TraceFormat || (exports.TraceFormat = TraceFormat = {}));
    var SetTraceNotification;
    (function(SetTraceNotification) {
      SetTraceNotification.type = new messages_1.NotificationType('$/setTrace');
    })(SetTraceNotification || (exports.SetTraceNotification = SetTraceNotification = {}));
    var LogTraceNotification;
    (function(LogTraceNotification) {
      LogTraceNotification.type = new messages_1.NotificationType('$/logTrace');
    })(LogTraceNotification || (exports.LogTraceNotification = LogTraceNotification = {}));
    var ConnectionErrors;
    (function(ConnectionErrors) {
      ConnectionErrors[ConnectionErrors['Closed'] = 1] = 'Closed';
      ConnectionErrors[ConnectionErrors['Disposed'] = 2] = 'Disposed';
      ConnectionErrors[ConnectionErrors['AlreadyListening'] = 3] = 'AlreadyListening';
    })(ConnectionErrors || (exports.ConnectionErrors = ConnectionErrors = {}));
    class ConnectionError extends Error {
      constructor(code, message) {
        super(message);
        this.code = code;
        Object.setPrototypeOf(this, ConnectionError.prototype);
      }
    }
    exports.ConnectionError = ConnectionError;
    var ConnectionStrategy;
    (function(ConnectionStrategy) {
      function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.cancelUndispatched);
      }
      ConnectionStrategy.is = is;
    })(ConnectionStrategy || (exports.ConnectionStrategy = ConnectionStrategy = {}));
    var IdCancellationReceiverStrategy;
    (function(IdCancellationReceiverStrategy) {
      function is(value) {
        const candidate = value;
        return candidate && (candidate.kind === undefined || candidate.kind === 'id') && Is.func(candidate.createCancellationTokenSource) && (candidate.dispose === undefined || Is.func(candidate.dispose));
      }
      IdCancellationReceiverStrategy.is = is;
    })(IdCancellationReceiverStrategy || (exports.IdCancellationReceiverStrategy = IdCancellationReceiverStrategy = {}));
    var RequestCancellationReceiverStrategy;
    (function(RequestCancellationReceiverStrategy) {
      function is(value) {
        const candidate = value;
        return candidate && candidate.kind === 'request' && Is.func(candidate.createCancellationTokenSource) && (candidate.dispose === undefined || Is.func(candidate.dispose));
      }
      RequestCancellationReceiverStrategy.is = is;
    })(RequestCancellationReceiverStrategy || (exports.RequestCancellationReceiverStrategy = RequestCancellationReceiverStrategy = {}));
    var CancellationReceiverStrategy;
    (function(CancellationReceiverStrategy) {
      CancellationReceiverStrategy.Message = Object.freeze({
        createCancellationTokenSource(_) {
          return new cancellation_1.CancellationTokenSource;
        }
      });
      function is(value) {
        return IdCancellationReceiverStrategy.is(value) || RequestCancellationReceiverStrategy.is(value);
      }
      CancellationReceiverStrategy.is = is;
    })(CancellationReceiverStrategy || (exports.CancellationReceiverStrategy = CancellationReceiverStrategy = {}));
    var CancellationSenderStrategy;
    (function(CancellationSenderStrategy) {
      CancellationSenderStrategy.Message = Object.freeze({
        sendCancellation(conn, id) {
          return conn.sendNotification(CancelNotification.type, {
            id: id
          });
        },
        cleanup(_) {}
      });
      function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.sendCancellation) && Is.func(candidate.cleanup);
      }
      CancellationSenderStrategy.is = is;
    })(CancellationSenderStrategy || (exports.CancellationSenderStrategy = CancellationSenderStrategy = {}));
    var CancellationStrategy;
    (function(CancellationStrategy) {
      CancellationStrategy.Message = Object.freeze({
        receiver: CancellationReceiverStrategy.Message,
        sender: CancellationSenderStrategy.Message
      });
      function is(value) {
        const candidate = value;
        return candidate && CancellationReceiverStrategy.is(candidate.receiver) && CancellationSenderStrategy.is(candidate.sender);
      }
      CancellationStrategy.is = is;
    })(CancellationStrategy || (exports.CancellationStrategy = CancellationStrategy = {}));
    var MessageStrategy;
    (function(MessageStrategy) {
      function is(value) {
        const candidate = value;
        return candidate && Is.func(candidate.handleMessage);
      }
      MessageStrategy.is = is;
    })(MessageStrategy || (exports.MessageStrategy = MessageStrategy = {}));
    var ConnectionOptions;
    (function(ConnectionOptions) {
      function is(value) {
        const candidate = value;
        return candidate && (CancellationStrategy.is(candidate.cancellationStrategy) || ConnectionStrategy.is(candidate.connectionStrategy) || MessageStrategy.is(candidate.messageStrategy));
      }
      ConnectionOptions.is = is;
    })(ConnectionOptions || (exports.ConnectionOptions = ConnectionOptions = {}));
    var ConnectionState;
    (function(ConnectionState) {
      ConnectionState[ConnectionState['New'] = 1] = 'New';
      ConnectionState[ConnectionState['Listening'] = 2] = 'Listening';
      ConnectionState[ConnectionState['Closed'] = 3] = 'Closed';
      ConnectionState[ConnectionState['Disposed'] = 4] = 'Disposed';
    })(ConnectionState || (ConnectionState = {}));
    function createMessageConnection(messageReader, messageWriter, _logger, options) {
      const logger = _logger !== undefined ? _logger : exports.NullLogger;
      let sequenceNumber = 0;
      let notificationSequenceNumber = 0;
      let unknownResponseSequenceNumber = 0;
      const version = '2.0';
      let starRequestHandler = undefined;
      const requestHandlers = new Map;
      let starNotificationHandler = undefined;
      const notificationHandlers = new Map;
      const progressHandlers = new Map;
      let timer;
      let messageQueue = new linkedMap_1.LinkedMap;
      let responsePromises = new Map;
      let knownCanceledRequests = new Set;
      let requestTokens = new Map;
      let trace = Trace.Off;
      let traceFormat = TraceFormat.Text;
      let tracer;
      let state = ConnectionState.New;
      const errorEmitter = new events_1.Emitter;
      const closeEmitter = new events_1.Emitter;
      const unhandledNotificationEmitter = new events_1.Emitter;
      const unhandledProgressEmitter = new events_1.Emitter;
      const disposeEmitter = new events_1.Emitter;
      const cancellationStrategy = options && options.cancellationStrategy ? options.cancellationStrategy : CancellationStrategy.Message;
      function createRequestQueueKey(id) {
        if (id === null) {
          throw new Error(`Can't send requests with id null since the response can't be correlated.`);
        }
        return 'req-' + id.toString();
      }
      function createResponseQueueKey(id) {
        if (id === null) {
          return 'res-unknown-' + (++unknownResponseSequenceNumber).toString();
        } else {
          return 'res-' + id.toString();
        }
      }
      function createNotificationQueueKey() {
        return 'not-' + (++notificationSequenceNumber).toString();
      }
      function addMessageToQueue(queue, message) {
        if (messages_1.Message.isRequest(message)) {
          queue.set(createRequestQueueKey(message.id), message);
        } else if (messages_1.Message.isResponse(message)) {
          queue.set(createResponseQueueKey(message.id), message);
        } else {
          queue.set(createNotificationQueueKey(), message);
        }
      }
      function cancelUndispatched(_message) {
        return undefined;
      }
      function isListening() {
        return state === ConnectionState.Listening;
      }
      function isClosed() {
        return state === ConnectionState.Closed;
      }
      function isDisposed() {
        return state === ConnectionState.Disposed;
      }
      function closeHandler() {
        if (state === ConnectionState.New || state === ConnectionState.Listening) {
          state = ConnectionState.Closed;
          closeEmitter.fire(undefined);
        }
      }
      function readErrorHandler(error) {
        errorEmitter.fire([ error, undefined, undefined ]);
      }
      function writeErrorHandler(data) {
        errorEmitter.fire(data);
      }
      messageReader.onClose(closeHandler);
      messageReader.onError(readErrorHandler);
      messageWriter.onClose(closeHandler);
      messageWriter.onError(writeErrorHandler);
      function triggerMessageQueue() {
        if (timer || messageQueue.size === 0) {
          return;
        }
        timer = (0, ral_1.default)().timer.setImmediate((() => {
          timer = undefined;
          processMessageQueue();
        }));
      }
      function handleMessage(message) {
        if (messages_1.Message.isRequest(message)) {
          handleRequest(message);
        } else if (messages_1.Message.isNotification(message)) {
          handleNotification(message);
        } else if (messages_1.Message.isResponse(message)) {
          handleResponse(message);
        } else {
          handleInvalidMessage(message);
        }
      }
      function processMessageQueue() {
        if (messageQueue.size === 0) {
          return;
        }
        const message = messageQueue.shift();
        try {
          const messageStrategy = options?.messageStrategy;
          if (MessageStrategy.is(messageStrategy)) {
            messageStrategy.handleMessage(message, handleMessage);
          } else {
            handleMessage(message);
          }
        } finally {
          triggerMessageQueue();
        }
      }
      const callback = message => {
        try {
          if (messages_1.Message.isNotification(message) && message.method === CancelNotification.type.method) {
            const cancelId = message.params.id;
            const key = createRequestQueueKey(cancelId);
            const toCancel = messageQueue.get(key);
            if (messages_1.Message.isRequest(toCancel)) {
              const strategy = options?.connectionStrategy;
              const response = strategy && strategy.cancelUndispatched ? strategy.cancelUndispatched(toCancel, cancelUndispatched) : cancelUndispatched(toCancel);
              if (response && (response.error !== undefined || response.result !== undefined)) {
                messageQueue.delete(key);
                requestTokens.delete(cancelId);
                response.id = toCancel.id;
                traceSendingResponse(response, message.method, Date.now());
                messageWriter.write(response).catch((() => logger.error(`Sending response for canceled message failed.`)));
                return;
              }
            }
            const cancellationToken = requestTokens.get(cancelId);
            if (cancellationToken !== undefined) {
              cancellationToken.cancel();
              traceReceivedNotification(message);
              return;
            } else {
              knownCanceledRequests.add(cancelId);
            }
          }
          addMessageToQueue(messageQueue, message);
        } finally {
          triggerMessageQueue();
        }
      };
      function handleRequest(requestMessage) {
        if (isDisposed()) {
          return;
        }
        function reply(resultOrError, method, startTime) {
          const message = {
            jsonrpc: version,
            id: requestMessage.id
          };
          if (resultOrError instanceof messages_1.ResponseError) {
            message.error = resultOrError.toJson();
          } else {
            message.result = resultOrError === undefined ? null : resultOrError;
          }
          traceSendingResponse(message, method, startTime);
          messageWriter.write(message).catch((() => logger.error(`Sending response failed.`)));
        }
        function replyError(error, method, startTime) {
          const message = {
            jsonrpc: version,
            id: requestMessage.id,
            error: error.toJson()
          };
          traceSendingResponse(message, method, startTime);
          messageWriter.write(message).catch((() => logger.error(`Sending response failed.`)));
        }
        function replySuccess(result, method, startTime) {
          if (result === undefined) {
            result = null;
          }
          const message = {
            jsonrpc: version,
            id: requestMessage.id,
            result: result
          };
          traceSendingResponse(message, method, startTime);
          messageWriter.write(message).catch((() => logger.error(`Sending response failed.`)));
        }
        traceReceivedRequest(requestMessage);
        const element = requestHandlers.get(requestMessage.method);
        let type;
        let requestHandler;
        if (element) {
          type = element.type;
          requestHandler = element.handler;
        }
        const startTime = Date.now();
        if (requestHandler || starRequestHandler) {
          const tokenKey = requestMessage.id ?? String(Date.now());
          const cancellationSource = IdCancellationReceiverStrategy.is(cancellationStrategy.receiver) ? cancellationStrategy.receiver.createCancellationTokenSource(tokenKey) : cancellationStrategy.receiver.createCancellationTokenSource(requestMessage);
          if (requestMessage.id !== null && knownCanceledRequests.has(requestMessage.id)) {
            cancellationSource.cancel();
          }
          if (requestMessage.id !== null) {
            requestTokens.set(tokenKey, cancellationSource);
          }
          try {
            let handlerResult;
            if (requestHandler) {
              if (requestMessage.params === undefined) {
                if (type !== undefined && type.numberOfParams !== 0) {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines ${type.numberOfParams} params but received none.`), requestMessage.method, startTime);
                  return;
                }
                handlerResult = requestHandler(cancellationSource.token);
              } else if (Array.isArray(requestMessage.params)) {
                if (type !== undefined && type.parameterStructures === messages_1.ParameterStructures.byName) {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines parameters by name but received parameters by position`), requestMessage.method, startTime);
                  return;
                }
                handlerResult = requestHandler(...requestMessage.params, cancellationSource.token);
              } else {
                if (type !== undefined && type.parameterStructures === messages_1.ParameterStructures.byPosition) {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines parameters by position but received parameters by name`), requestMessage.method, startTime);
                  return;
                }
                handlerResult = requestHandler(requestMessage.params, cancellationSource.token);
              }
            } else if (starRequestHandler) {
              handlerResult = starRequestHandler(requestMessage.method, requestMessage.params, cancellationSource.token);
            }
            const promise = handlerResult;
            if (!handlerResult) {
              requestTokens.delete(tokenKey);
              replySuccess(handlerResult, requestMessage.method, startTime);
            } else if (promise.then) {
              promise.then((resultOrError => {
                requestTokens.delete(tokenKey);
                reply(resultOrError, requestMessage.method, startTime);
              }), (error => {
                requestTokens.delete(tokenKey);
                if (error instanceof messages_1.ResponseError) {
                  replyError(error, requestMessage.method, startTime);
                } else if (error && Is.string(error.message)) {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`), requestMessage.method, startTime);
                } else {
                  replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`), requestMessage.method, startTime);
                }
              }));
            } else {
              requestTokens.delete(tokenKey);
              reply(handlerResult, requestMessage.method, startTime);
            }
          } catch (error) {
            requestTokens.delete(tokenKey);
            if (error instanceof messages_1.ResponseError) {
              reply(error, requestMessage.method, startTime);
            } else if (error && Is.string(error.message)) {
              replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`), requestMessage.method, startTime);
            } else {
              replyError(new messages_1.ResponseError(messages_1.ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`), requestMessage.method, startTime);
            }
          }
        } else {
          replyError(new messages_1.ResponseError(messages_1.ErrorCodes.MethodNotFound, `Unhandled method ${requestMessage.method}`), requestMessage.method, startTime);
        }
      }
      function handleResponse(responseMessage) {
        if (isDisposed()) {
          return;
        }
        if (responseMessage.id === null) {
          if (responseMessage.error) {
            logger.error(`Received response message without id: Error is: \n${JSON.stringify(responseMessage.error, undefined, 4)}`);
          } else {
            logger.error(`Received response message without id. No further error information provided.`);
          }
        } else {
          const key = responseMessage.id;
          const responsePromise = responsePromises.get(key);
          traceReceivedResponse(responseMessage, responsePromise);
          if (responsePromise !== undefined) {
            responsePromises.delete(key);
            try {
              if (responseMessage.error) {
                const error = responseMessage.error;
                responsePromise.reject(new messages_1.ResponseError(error.code, error.message, error.data));
              } else if (responseMessage.result !== undefined) {
                responsePromise.resolve(responseMessage.result);
              } else {
                throw new Error('Should never happen.');
              }
            } catch (error) {
              if (error.message) {
                logger.error(`Response handler '${responsePromise.method}' failed with message: ${error.message}`);
              } else {
                logger.error(`Response handler '${responsePromise.method}' failed unexpectedly.`);
              }
            }
          }
        }
      }
      function handleNotification(message) {
        if (isDisposed()) {
          return;
        }
        let type = undefined;
        let notificationHandler;
        if (message.method === CancelNotification.type.method) {
          const cancelId = message.params.id;
          knownCanceledRequests.delete(cancelId);
          traceReceivedNotification(message);
          return;
        } else {
          const element = notificationHandlers.get(message.method);
          if (element) {
            notificationHandler = element.handler;
            type = element.type;
          }
        }
        if (notificationHandler || starNotificationHandler) {
          try {
            traceReceivedNotification(message);
            if (notificationHandler) {
              if (message.params === undefined) {
                if (type !== undefined) {
                  if (type.numberOfParams !== 0 && type.parameterStructures !== messages_1.ParameterStructures.byName) {
                    logger.error(`Notification ${message.method} defines ${type.numberOfParams} params but received none.`);
                  }
                }
                notificationHandler();
              } else if (Array.isArray(message.params)) {
                const params = message.params;
                if (message.method === ProgressNotification.type.method && params.length === 2 && ProgressToken.is(params[0])) {
                  notificationHandler({
                    token: params[0],
                    value: params[1]
                  });
                } else {
                  if (type !== undefined) {
                    if (type.parameterStructures === messages_1.ParameterStructures.byName) {
                      logger.error(`Notification ${message.method} defines parameters by name but received parameters by position`);
                    }
                    if (type.numberOfParams !== message.params.length) {
                      logger.error(`Notification ${message.method} defines ${type.numberOfParams} params but received ${params.length} arguments`);
                    }
                  }
                  notificationHandler(...params);
                }
              } else {
                if (type !== undefined && type.parameterStructures === messages_1.ParameterStructures.byPosition) {
                  logger.error(`Notification ${message.method} defines parameters by position but received parameters by name`);
                }
                notificationHandler(message.params);
              }
            } else if (starNotificationHandler) {
              starNotificationHandler(message.method, message.params);
            }
          } catch (error) {
            if (error.message) {
              logger.error(`Notification handler '${message.method}' failed with message: ${error.message}`);
            } else {
              logger.error(`Notification handler '${message.method}' failed unexpectedly.`);
            }
          }
        } else {
          unhandledNotificationEmitter.fire(message);
        }
      }
      function handleInvalidMessage(message) {
        if (!message) {
          logger.error('Received empty message.');
          return;
        }
        logger.error(`Received message which is neither a response nor a notification message:\n${JSON.stringify(message, null, 4)}`);
        const responseMessage = message;
        if (Is.string(responseMessage.id) || Is.number(responseMessage.id)) {
          const key = responseMessage.id;
          const responseHandler = responsePromises.get(key);
          if (responseHandler) {
            responseHandler.reject(new Error('The received response has neither a result nor an error property.'));
          }
        }
      }
      function stringifyTrace(params) {
        if (params === undefined || params === null) {
          return undefined;
        }
        switch (trace) {
         case Trace.Verbose:
          return JSON.stringify(params, null, 4);

         case Trace.Compact:
          return JSON.stringify(params);

         default:
          return undefined;
        }
      }
      function traceSendingRequest(message) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = undefined;
          if ((trace === Trace.Verbose || trace === Trace.Compact) && message.params) {
            data = `Params: ${stringifyTrace(message.params)}\n\n`;
          }
          tracer.log(`Sending request '${message.method} - (${message.id})'.`, data);
        } else {
          logLSPMessage('send-request', message);
        }
      }
      function traceSendingNotification(message) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = undefined;
          if (trace === Trace.Verbose || trace === Trace.Compact) {
            if (message.params) {
              data = `Params: ${stringifyTrace(message.params)}\n\n`;
            } else {
              data = 'No parameters provided.\n\n';
            }
          }
          tracer.log(`Sending notification '${message.method}'.`, data);
        } else {
          logLSPMessage('send-notification', message);
        }
      }
      function traceSendingResponse(message, method, startTime) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = undefined;
          if (trace === Trace.Verbose || trace === Trace.Compact) {
            if (message.error && message.error.data) {
              data = `Error data: ${stringifyTrace(message.error.data)}\n\n`;
            } else {
              if (message.result) {
                data = `Result: ${stringifyTrace(message.result)}\n\n`;
              } else if (message.error === undefined) {
                data = 'No result returned.\n\n';
              }
            }
          }
          tracer.log(`Sending response '${method} - (${message.id})'. Processing request took ${Date.now() - startTime}ms`, data);
        } else {
          logLSPMessage('send-response', message);
        }
      }
      function traceReceivedRequest(message) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = undefined;
          if ((trace === Trace.Verbose || trace === Trace.Compact) && message.params) {
            data = `Params: ${stringifyTrace(message.params)}\n\n`;
          }
          tracer.log(`Received request '${message.method} - (${message.id})'.`, data);
        } else {
          logLSPMessage('receive-request', message);
        }
      }
      function traceReceivedNotification(message) {
        if (trace === Trace.Off || !tracer || message.method === LogTraceNotification.type.method) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = undefined;
          if (trace === Trace.Verbose || trace === Trace.Compact) {
            if (message.params) {
              data = `Params: ${stringifyTrace(message.params)}\n\n`;
            } else {
              data = 'No parameters provided.\n\n';
            }
          }
          tracer.log(`Received notification '${message.method}'.`, data);
        } else {
          logLSPMessage('receive-notification', message);
        }
      }
      function traceReceivedResponse(message, responsePromise) {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        if (traceFormat === TraceFormat.Text) {
          let data = undefined;
          if (trace === Trace.Verbose || trace === Trace.Compact) {
            if (message.error && message.error.data) {
              data = `Error data: ${stringifyTrace(message.error.data)}\n\n`;
            } else {
              if (message.result) {
                data = `Result: ${stringifyTrace(message.result)}\n\n`;
              } else if (message.error === undefined) {
                data = 'No result returned.\n\n';
              }
            }
          }
          if (responsePromise) {
            const error = message.error ? ` Request failed: ${message.error.message} (${message.error.code}).` : '';
            tracer.log(`Received response '${responsePromise.method} - (${message.id})' in ${Date.now() - responsePromise.timerStart}ms.${error}`, data);
          } else {
            tracer.log(`Received response ${message.id} without active response promise.`, data);
          }
        } else {
          logLSPMessage('receive-response', message);
        }
      }
      function logLSPMessage(type, message) {
        if (!tracer || trace === Trace.Off) {
          return;
        }
        const lspMessage = {
          isLSPMessage: true,
          type: type,
          message: message,
          timestamp: Date.now()
        };
        tracer.log(lspMessage);
      }
      function throwIfClosedOrDisposed() {
        if (isClosed()) {
          throw new ConnectionError(ConnectionErrors.Closed, 'Connection is closed.');
        }
        if (isDisposed()) {
          throw new ConnectionError(ConnectionErrors.Disposed, 'Connection is disposed.');
        }
      }
      function throwIfListening() {
        if (isListening()) {
          throw new ConnectionError(ConnectionErrors.AlreadyListening, 'Connection is already listening');
        }
      }
      function throwIfNotListening() {
        if (!isListening()) {
          throw new Error('Call listen() first.');
        }
      }
      function undefinedToNull(param) {
        if (param === undefined) {
          return null;
        } else {
          return param;
        }
      }
      function nullToUndefined(param) {
        if (param === null) {
          return undefined;
        } else {
          return param;
        }
      }
      function isNamedParam(param) {
        return param !== undefined && param !== null && !Array.isArray(param) && typeof param === 'object';
      }
      function computeSingleParam(parameterStructures, param) {
        switch (parameterStructures) {
         case messages_1.ParameterStructures.auto:
          if (isNamedParam(param)) {
            return nullToUndefined(param);
          } else {
            return [ undefinedToNull(param) ];
          }

         case messages_1.ParameterStructures.byName:
          if (!isNamedParam(param)) {
            throw new Error(`Received parameters by name but param is not an object literal.`);
          }
          return nullToUndefined(param);

         case messages_1.ParameterStructures.byPosition:
          return [ undefinedToNull(param) ];

         default:
          throw new Error(`Unknown parameter structure ${parameterStructures.toString()}`);
        }
      }
      function computeMessageParams(type, params) {
        let result;
        const numberOfParams = type.numberOfParams;
        switch (numberOfParams) {
         case 0:
          result = undefined;
          break;

         case 1:
          result = computeSingleParam(type.parameterStructures, params[0]);
          break;

         default:
          result = [];
          for (let i = 0; i < params.length && i < numberOfParams; i++) {
            result.push(undefinedToNull(params[i]));
          }
          if (params.length < numberOfParams) {
            for (let i = params.length; i < numberOfParams; i++) {
              result.push(null);
            }
          }
          break;
        }
        return result;
      }
      const connection = {
        sendNotification: (type, ...args) => {
          throwIfClosedOrDisposed();
          let method;
          let messageParams;
          if (Is.string(type)) {
            method = type;
            const first = args[0];
            let paramStart = 0;
            let parameterStructures = messages_1.ParameterStructures.auto;
            if (messages_1.ParameterStructures.is(first)) {
              paramStart = 1;
              parameterStructures = first;
            }
            let paramEnd = args.length;
            const numberOfParams = paramEnd - paramStart;
            switch (numberOfParams) {
             case 0:
              messageParams = undefined;
              break;

             case 1:
              messageParams = computeSingleParam(parameterStructures, args[paramStart]);
              break;

             default:
              if (parameterStructures === messages_1.ParameterStructures.byName) {
                throw new Error(`Received ${numberOfParams} parameters for 'by Name' notification parameter structure.`);
              }
              messageParams = args.slice(paramStart, paramEnd).map((value => undefinedToNull(value)));
              break;
            }
          } else {
            const params = args;
            method = type.method;
            messageParams = computeMessageParams(type, params);
          }
          const notificationMessage = {
            jsonrpc: version,
            method: method,
            params: messageParams
          };
          traceSendingNotification(notificationMessage);
          return messageWriter.write(notificationMessage).catch((error => {
            logger.error(`Sending notification failed.`);
            throw error;
          }));
        },
        onNotification: (type, handler) => {
          throwIfClosedOrDisposed();
          let method;
          if (Is.func(type)) {
            starNotificationHandler = type;
          } else if (handler) {
            if (Is.string(type)) {
              method = type;
              notificationHandlers.set(type, {
                type: undefined,
                handler: handler
              });
            } else {
              method = type.method;
              notificationHandlers.set(type.method, {
                type: type,
                handler: handler
              });
            }
          }
          return {
            dispose: () => {
              if (method !== undefined) {
                notificationHandlers.delete(method);
              } else {
                starNotificationHandler = undefined;
              }
            }
          };
        },
        onProgress: (_type, token, handler) => {
          if (progressHandlers.has(token)) {
            throw new Error(`Progress handler for token ${token} already registered`);
          }
          progressHandlers.set(token, handler);
          return {
            dispose: () => {
              progressHandlers.delete(token);
            }
          };
        },
        sendProgress: (_type, token, value) => connection.sendNotification(ProgressNotification.type, {
          token: token,
          value: value
        }),
        onUnhandledProgress: unhandledProgressEmitter.event,
        sendRequest: (type, ...args) => {
          throwIfClosedOrDisposed();
          throwIfNotListening();
          let method;
          let messageParams;
          let token = undefined;
          if (Is.string(type)) {
            method = type;
            const first = args[0];
            const last = args[args.length - 1];
            let paramStart = 0;
            let parameterStructures = messages_1.ParameterStructures.auto;
            if (messages_1.ParameterStructures.is(first)) {
              paramStart = 1;
              parameterStructures = first;
            }
            let paramEnd = args.length;
            if (cancellation_1.CancellationToken.is(last)) {
              paramEnd = paramEnd - 1;
              token = last;
            }
            const numberOfParams = paramEnd - paramStart;
            switch (numberOfParams) {
             case 0:
              messageParams = undefined;
              break;

             case 1:
              messageParams = computeSingleParam(parameterStructures, args[paramStart]);
              break;

             default:
              if (parameterStructures === messages_1.ParameterStructures.byName) {
                throw new Error(`Received ${numberOfParams} parameters for 'by Name' request parameter structure.`);
              }
              messageParams = args.slice(paramStart, paramEnd).map((value => undefinedToNull(value)));
              break;
            }
          } else {
            const params = args;
            method = type.method;
            messageParams = computeMessageParams(type, params);
            const numberOfParams = type.numberOfParams;
            token = cancellation_1.CancellationToken.is(params[numberOfParams]) ? params[numberOfParams] : undefined;
          }
          const id = sequenceNumber++;
          let disposable;
          if (token) {
            disposable = token.onCancellationRequested((() => {
              const p = cancellationStrategy.sender.sendCancellation(connection, id);
              if (p === undefined) {
                logger.log(`Received no promise from cancellation strategy when cancelling id ${id}`);
                return Promise.resolve();
              } else {
                return p.catch((() => {
                  logger.log(`Sending cancellation messages for id ${id} failed`);
                }));
              }
            }));
          }
          const requestMessage = {
            jsonrpc: version,
            id: id,
            method: method,
            params: messageParams
          };
          traceSendingRequest(requestMessage);
          if (typeof cancellationStrategy.sender.enableCancellation === 'function') {
            cancellationStrategy.sender.enableCancellation(requestMessage);
          }
          return new Promise((async (resolve, reject) => {
            const resolveWithCleanup = r => {
              resolve(r);
              cancellationStrategy.sender.cleanup(id);
              disposable?.dispose();
            };
            const rejectWithCleanup = r => {
              reject(r);
              cancellationStrategy.sender.cleanup(id);
              disposable?.dispose();
            };
            const responsePromise = {
              method: method,
              timerStart: Date.now(),
              resolve: resolveWithCleanup,
              reject: rejectWithCleanup
            };
            try {
              await messageWriter.write(requestMessage);
              responsePromises.set(id, responsePromise);
            } catch (error) {
              logger.error(`Sending request failed.`);
              responsePromise.reject(new messages_1.ResponseError(messages_1.ErrorCodes.MessageWriteError, error.message ? error.message : 'Unknown reason'));
              throw error;
            }
          }));
        },
        onRequest: (type, handler) => {
          throwIfClosedOrDisposed();
          let method = null;
          if (StarRequestHandler.is(type)) {
            method = undefined;
            starRequestHandler = type;
          } else if (Is.string(type)) {
            method = null;
            if (handler !== undefined) {
              method = type;
              requestHandlers.set(type, {
                handler: handler,
                type: undefined
              });
            }
          } else {
            if (handler !== undefined) {
              method = type.method;
              requestHandlers.set(type.method, {
                type: type,
                handler: handler
              });
            }
          }
          return {
            dispose: () => {
              if (method === null) {
                return;
              }
              if (method !== undefined) {
                requestHandlers.delete(method);
              } else {
                starRequestHandler = undefined;
              }
            }
          };
        },
        hasPendingResponse: () => responsePromises.size > 0,
        trace: async (_value, _tracer, sendNotificationOrTraceOptions) => {
          let _sendNotification = false;
          let _traceFormat = TraceFormat.Text;
          if (sendNotificationOrTraceOptions !== undefined) {
            if (Is.boolean(sendNotificationOrTraceOptions)) {
              _sendNotification = sendNotificationOrTraceOptions;
            } else {
              _sendNotification = sendNotificationOrTraceOptions.sendNotification || false;
              _traceFormat = sendNotificationOrTraceOptions.traceFormat || TraceFormat.Text;
            }
          }
          trace = _value;
          traceFormat = _traceFormat;
          if (trace === Trace.Off) {
            tracer = undefined;
          } else {
            tracer = _tracer;
          }
          if (_sendNotification && !isClosed() && !isDisposed()) {
            await connection.sendNotification(SetTraceNotification.type, {
              value: Trace.toString(_value)
            });
          }
        },
        onError: errorEmitter.event,
        onClose: closeEmitter.event,
        onUnhandledNotification: unhandledNotificationEmitter.event,
        onDispose: disposeEmitter.event,
        end: () => {
          messageWriter.end();
        },
        dispose: () => {
          if (isDisposed()) {
            return;
          }
          state = ConnectionState.Disposed;
          disposeEmitter.fire(undefined);
          const error = new messages_1.ResponseError(messages_1.ErrorCodes.PendingResponseRejected, 'Pending response rejected since connection got disposed');
          for (const promise of responsePromises.values()) {
            promise.reject(error);
          }
          responsePromises = new Map;
          requestTokens = new Map;
          knownCanceledRequests = new Set;
          messageQueue = new linkedMap_1.LinkedMap;
          if (Is.func(messageWriter.dispose)) {
            messageWriter.dispose();
          }
          if (Is.func(messageReader.dispose)) {
            messageReader.dispose();
          }
        },
        listen: () => {
          throwIfClosedOrDisposed();
          throwIfListening();
          state = ConnectionState.Listening;
          messageReader.listen(callback);
        },
        inspect: () => {
          (0, ral_1.default)().console.log('inspect');
        }
      };
      connection.onNotification(LogTraceNotification.type, (params => {
        if (trace === Trace.Off || !tracer) {
          return;
        }
        const verbose = trace === Trace.Verbose || trace === Trace.Compact;
        tracer.log(params.message, verbose ? params.verbose : undefined);
      }));
      connection.onNotification(ProgressNotification.type, (params => {
        const handler = progressHandlers.get(params.token);
        if (handler) {
          handler(params.value);
        } else {
          unhandledProgressEmitter.fire(params);
        }
      }));
      return connection;
    }
    exports.createMessageConnection = createMessageConnection;
  })(connection$1);
  return connection$1;
}

var hasRequiredApi;

function requireApi() {
  if (hasRequiredApi) return api$2;
  hasRequiredApi = 1;
  (function(exports) {
    Object.defineProperty(exports, '__esModule', {
      value: true
    });
    exports.ProgressType = exports.ProgressToken = exports.createMessageConnection = exports.NullLogger = exports.ConnectionOptions = exports.ConnectionStrategy = exports.AbstractMessageBuffer = exports.WriteableStreamMessageWriter = exports.AbstractMessageWriter = exports.MessageWriter = exports.ReadableStreamMessageReader = exports.AbstractMessageReader = exports.MessageReader = exports.SharedArrayReceiverStrategy = exports.SharedArraySenderStrategy = exports.CancellationToken = exports.CancellationTokenSource = exports.Emitter = exports.Event = exports.Disposable = exports.LRUCache = exports.Touch = exports.LinkedMap = exports.ParameterStructures = exports.NotificationType9 = exports.NotificationType8 = exports.NotificationType7 = exports.NotificationType6 = exports.NotificationType5 = exports.NotificationType4 = exports.NotificationType3 = exports.NotificationType2 = exports.NotificationType1 = exports.NotificationType0 = exports.NotificationType = exports.ErrorCodes = exports.ResponseError = exports.RequestType9 = exports.RequestType8 = exports.RequestType7 = exports.RequestType6 = exports.RequestType5 = exports.RequestType4 = exports.RequestType3 = exports.RequestType2 = exports.RequestType1 = exports.RequestType0 = exports.RequestType = exports.Message = exports.RAL = void 0;
    exports.MessageStrategy = exports.CancellationStrategy = exports.CancellationSenderStrategy = exports.CancellationReceiverStrategy = exports.ConnectionError = exports.ConnectionErrors = exports.LogTraceNotification = exports.SetTraceNotification = exports.TraceFormat = exports.TraceValues = exports.Trace = void 0;
    const messages_1 = requireMessages();
    Object.defineProperty(exports, 'Message', {
      enumerable: true,
      get: function() {
        return messages_1.Message;
      }
    });
    Object.defineProperty(exports, 'RequestType', {
      enumerable: true,
      get: function() {
        return messages_1.RequestType;
      }
    });
    Object.defineProperty(exports, 'RequestType0', {
      enumerable: true,
      get: function() {
        return messages_1.RequestType0;
      }
    });
    Object.defineProperty(exports, 'RequestType1', {
      enumerable: true,
      get: function() {
        return messages_1.RequestType1;
      }
    });
    Object.defineProperty(exports, 'RequestType2', {
      enumerable: true,
      get: function() {
        return messages_1.RequestType2;
      }
    });
    Object.defineProperty(exports, 'RequestType3', {
      enumerable: true,
      get: function() {
        return messages_1.RequestType3;
      }
    });
    Object.defineProperty(exports, 'RequestType4', {
      enumerable: true,
      get: function() {
        return messages_1.RequestType4;
      }
    });
    Object.defineProperty(exports, 'RequestType5', {
      enumerable: true,
      get: function() {
        return messages_1.RequestType5;
      }
    });
    Object.defineProperty(exports, 'RequestType6', {
      enumerable: true,
      get: function() {
        return messages_1.RequestType6;
      }
    });
    Object.defineProperty(exports, 'RequestType7', {
      enumerable: true,
      get: function() {
        return messages_1.RequestType7;
      }
    });
    Object.defineProperty(exports, 'RequestType8', {
      enumerable: true,
      get: function() {
        return messages_1.RequestType8;
      }
    });
    Object.defineProperty(exports, 'RequestType9', {
      enumerable: true,
      get: function() {
        return messages_1.RequestType9;
      }
    });
    Object.defineProperty(exports, 'ResponseError', {
      enumerable: true,
      get: function() {
        return messages_1.ResponseError;
      }
    });
    Object.defineProperty(exports, 'ErrorCodes', {
      enumerable: true,
      get: function() {
        return messages_1.ErrorCodes;
      }
    });
    Object.defineProperty(exports, 'NotificationType', {
      enumerable: true,
      get: function() {
        return messages_1.NotificationType;
      }
    });
    Object.defineProperty(exports, 'NotificationType0', {
      enumerable: true,
      get: function() {
        return messages_1.NotificationType0;
      }
    });
    Object.defineProperty(exports, 'NotificationType1', {
      enumerable: true,
      get: function() {
        return messages_1.NotificationType1;
      }
    });
    Object.defineProperty(exports, 'NotificationType2', {
      enumerable: true,
      get: function() {
        return messages_1.NotificationType2;
      }
    });
    Object.defineProperty(exports, 'NotificationType3', {
      enumerable: true,
      get: function() {
        return messages_1.NotificationType3;
      }
    });
    Object.defineProperty(exports, 'NotificationType4', {
      enumerable: true,
      get: function() {
        return messages_1.NotificationType4;
      }
    });
    Object.defineProperty(exports, 'NotificationType5', {
      enumerable: true,
      get: function() {
        return messages_1.NotificationType5;
      }
    });
    Object.defineProperty(exports, 'NotificationType6', {
      enumerable: true,
      get: function() {
        return messages_1.NotificationType6;
      }
    });
    Object.defineProperty(exports, 'NotificationType7', {
      enumerable: true,
      get: function() {
        return messages_1.NotificationType7;
      }
    });
    Object.defineProperty(exports, 'NotificationType8', {
      enumerable: true,
      get: function() {
        return messages_1.NotificationType8;
      }
    });
    Object.defineProperty(exports, 'NotificationType9', {
      enumerable: true,
      get: function() {
        return messages_1.NotificationType9;
      }
    });
    Object.defineProperty(exports, 'ParameterStructures', {
      enumerable: true,
      get: function() {
        return messages_1.ParameterStructures;
      }
    });
    const linkedMap_1 = requireLinkedMap();
    Object.defineProperty(exports, 'LinkedMap', {
      enumerable: true,
      get: function() {
        return linkedMap_1.LinkedMap;
      }
    });
    Object.defineProperty(exports, 'LRUCache', {
      enumerable: true,
      get: function() {
        return linkedMap_1.LRUCache;
      }
    });
    Object.defineProperty(exports, 'Touch', {
      enumerable: true,
      get: function() {
        return linkedMap_1.Touch;
      }
    });
    const disposable_1 = requireDisposable();
    Object.defineProperty(exports, 'Disposable', {
      enumerable: true,
      get: function() {
        return disposable_1.Disposable;
      }
    });
    const events_1 = requireEvents();
    Object.defineProperty(exports, 'Event', {
      enumerable: true,
      get: function() {
        return events_1.Event;
      }
    });
    Object.defineProperty(exports, 'Emitter', {
      enumerable: true,
      get: function() {
        return events_1.Emitter;
      }
    });
    const cancellation_1 = requireCancellation();
    Object.defineProperty(exports, 'CancellationTokenSource', {
      enumerable: true,
      get: function() {
        return cancellation_1.CancellationTokenSource;
      }
    });
    Object.defineProperty(exports, 'CancellationToken', {
      enumerable: true,
      get: function() {
        return cancellation_1.CancellationToken;
      }
    });
    const sharedArrayCancellation_1 = requireSharedArrayCancellation();
    Object.defineProperty(exports, 'SharedArraySenderStrategy', {
      enumerable: true,
      get: function() {
        return sharedArrayCancellation_1.SharedArraySenderStrategy;
      }
    });
    Object.defineProperty(exports, 'SharedArrayReceiverStrategy', {
      enumerable: true,
      get: function() {
        return sharedArrayCancellation_1.SharedArrayReceiverStrategy;
      }
    });
    const messageReader_1 = requireMessageReader();
    Object.defineProperty(exports, 'MessageReader', {
      enumerable: true,
      get: function() {
        return messageReader_1.MessageReader;
      }
    });
    Object.defineProperty(exports, 'AbstractMessageReader', {
      enumerable: true,
      get: function() {
        return messageReader_1.AbstractMessageReader;
      }
    });
    Object.defineProperty(exports, 'ReadableStreamMessageReader', {
      enumerable: true,
      get: function() {
        return messageReader_1.ReadableStreamMessageReader;
      }
    });
    const messageWriter_1 = requireMessageWriter();
    Object.defineProperty(exports, 'MessageWriter', {
      enumerable: true,
      get: function() {
        return messageWriter_1.MessageWriter;
      }
    });
    Object.defineProperty(exports, 'AbstractMessageWriter', {
      enumerable: true,
      get: function() {
        return messageWriter_1.AbstractMessageWriter;
      }
    });
    Object.defineProperty(exports, 'WriteableStreamMessageWriter', {
      enumerable: true,
      get: function() {
        return messageWriter_1.WriteableStreamMessageWriter;
      }
    });
    const messageBuffer_1 = requireMessageBuffer();
    Object.defineProperty(exports, 'AbstractMessageBuffer', {
      enumerable: true,
      get: function() {
        return messageBuffer_1.AbstractMessageBuffer;
      }
    });
    const connection_1 = requireConnection();
    Object.defineProperty(exports, 'ConnectionStrategy', {
      enumerable: true,
      get: function() {
        return connection_1.ConnectionStrategy;
      }
    });
    Object.defineProperty(exports, 'ConnectionOptions', {
      enumerable: true,
      get: function() {
        return connection_1.ConnectionOptions;
      }
    });
    Object.defineProperty(exports, 'NullLogger', {
      enumerable: true,
      get: function() {
        return connection_1.NullLogger;
      }
    });
    Object.defineProperty(exports, 'createMessageConnection', {
      enumerable: true,
      get: function() {
        return connection_1.createMessageConnection;
      }
    });
    Object.defineProperty(exports, 'ProgressToken', {
      enumerable: true,
      get: function() {
        return connection_1.ProgressToken;
      }
    });
    Object.defineProperty(exports, 'ProgressType', {
      enumerable: true,
      get: function() {
        return connection_1.ProgressType;
      }
    });
    Object.defineProperty(exports, 'Trace', {
      enumerable: true,
      get: function() {
        return connection_1.Trace;
      }
    });
    Object.defineProperty(exports, 'TraceValues', {
      enumerable: true,
      get: function() {
        return connection_1.TraceValues;
      }
    });
    Object.defineProperty(exports, 'TraceFormat', {
      enumerable: true,
      get: function() {
        return connection_1.TraceFormat;
      }
    });
    Object.defineProperty(exports, 'SetTraceNotification', {
      enumerable: true,
      get: function() {
        return connection_1.SetTraceNotification;
      }
    });
    Object.defineProperty(exports, 'LogTraceNotification', {
      enumerable: true,
      get: function() {
        return connection_1.LogTraceNotification;
      }
    });
    Object.defineProperty(exports, 'ConnectionErrors', {
      enumerable: true,
      get: function() {
        return connection_1.ConnectionErrors;
      }
    });
    Object.defineProperty(exports, 'ConnectionError', {
      enumerable: true,
      get: function() {
        return connection_1.ConnectionError;
      }
    });
    Object.defineProperty(exports, 'CancellationReceiverStrategy', {
      enumerable: true,
      get: function() {
        return connection_1.CancellationReceiverStrategy;
      }
    });
    Object.defineProperty(exports, 'CancellationSenderStrategy', {
      enumerable: true,
      get: function() {
        return connection_1.CancellationSenderStrategy;
      }
    });
    Object.defineProperty(exports, 'CancellationStrategy', {
      enumerable: true,
      get: function() {
        return connection_1.CancellationStrategy;
      }
    });
    Object.defineProperty(exports, 'MessageStrategy', {
      enumerable: true,
      get: function() {
        return connection_1.MessageStrategy;
      }
    });
    const ral_1 = requireRal();
    exports.RAL = ral_1.default;
  })(api$2);
  return api$2;
}

Object.defineProperty(ril, '__esModule', {
  value: true
});

const util_1 = require$$0$2;

const api_1 = requireApi();

class MessageBuffer extends api_1.AbstractMessageBuffer {
  constructor(encoding = 'utf-8') {
    super(encoding);
  }
  emptyBuffer() {
    return MessageBuffer.emptyBuffer;
  }
  fromString(value, encoding) {
    return Buffer.from(value, encoding);
  }
  toString(value, encoding) {
    if (value instanceof Buffer) {
      return value.toString(encoding);
    } else {
      return new util_1.TextDecoder(encoding).decode(value);
    }
  }
  asNative(buffer, length) {
    if (length === undefined) {
      return buffer instanceof Buffer ? buffer : Buffer.from(buffer);
    } else {
      return buffer instanceof Buffer ? buffer.slice(0, length) : Buffer.from(buffer, 0, length);
    }
  }
  allocNative(length) {
    return Buffer.allocUnsafe(length);
  }
}

MessageBuffer.emptyBuffer = Buffer.allocUnsafe(0);

class ReadableStreamWrapper {
  constructor(stream) {
    this.stream = stream;
  }
  onClose(listener) {
    this.stream.on('close', listener);
    return api_1.Disposable.create((() => this.stream.off('close', listener)));
  }
  onError(listener) {
    this.stream.on('error', listener);
    return api_1.Disposable.create((() => this.stream.off('error', listener)));
  }
  onEnd(listener) {
    this.stream.on('end', listener);
    return api_1.Disposable.create((() => this.stream.off('end', listener)));
  }
  onData(listener) {
    this.stream.on('data', listener);
    return api_1.Disposable.create((() => this.stream.off('data', listener)));
  }
}

class WritableStreamWrapper {
  constructor(stream) {
    this.stream = stream;
  }
  onClose(listener) {
    this.stream.on('close', listener);
    return api_1.Disposable.create((() => this.stream.off('close', listener)));
  }
  onError(listener) {
    this.stream.on('error', listener);
    return api_1.Disposable.create((() => this.stream.off('error', listener)));
  }
  onEnd(listener) {
    this.stream.on('end', listener);
    return api_1.Disposable.create((() => this.stream.off('end', listener)));
  }
  write(data, encoding) {
    return new Promise(((resolve, reject) => {
      const callback = error => {
        if (error === undefined || error === null) {
          resolve();
        } else {
          reject(error);
        }
      };
      if (typeof data === 'string') {
        this.stream.write(data, encoding, callback);
      } else {
        this.stream.write(data, callback);
      }
    }));
  }
  end() {
    this.stream.end();
  }
}

const _ril = Object.freeze({
  messageBuffer: Object.freeze({
    create: encoding => new MessageBuffer(encoding)
  }),
  applicationJson: Object.freeze({
    encoder: Object.freeze({
      name: 'application/json',
      encode: (msg, options) => {
        try {
          return Promise.resolve(Buffer.from(JSON.stringify(msg, undefined, 0), options.charset));
        } catch (err) {
          return Promise.reject(err);
        }
      }
    }),
    decoder: Object.freeze({
      name: 'application/json',
      decode: (buffer, options) => {
        try {
          if (buffer instanceof Buffer) {
            return Promise.resolve(JSON.parse(buffer.toString(options.charset)));
          } else {
            return Promise.resolve(JSON.parse(new util_1.TextDecoder(options.charset).decode(buffer)));
          }
        } catch (err) {
          return Promise.reject(err);
        }
      }
    })
  }),
  stream: Object.freeze({
    asReadableStream: stream => new ReadableStreamWrapper(stream),
    asWritableStream: stream => new WritableStreamWrapper(stream)
  }),
  console: console,
  timer: Object.freeze({
    setTimeout(callback, ms, ...args) {
      const handle = setTimeout(callback, ms, ...args);
      return {
        dispose: () => clearTimeout(handle)
      };
    },
    setImmediate(callback, ...args) {
      const handle = setImmediate(callback, ...args);
      return {
        dispose: () => clearImmediate(handle)
      };
    },
    setInterval(callback, ms, ...args) {
      const handle = setInterval(callback, ms, ...args);
      return {
        dispose: () => clearInterval(handle)
      };
    }
  })
});

function RIL() {
  return _ril;
}

(function(RIL) {
  function install() {
    api_1.RAL.install(_ril);
  }
  RIL.install = install;
})(RIL || (RIL = {}));

ril.default = RIL;

(function(exports) {
  var __createBinding = commonjsGlobal && commonjsGlobal.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = {
        enumerable: true,
        get: function() {
          return m[k];
        }
      };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
  });
  var __exportStar = commonjsGlobal && commonjsGlobal.__exportStar || function(m, exports) {
    for (var p in m) if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
  };
  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  exports.createMessageConnection = exports.createServerSocketTransport = exports.createClientSocketTransport = exports.createServerPipeTransport = exports.createClientPipeTransport = exports.generateRandomPipeName = exports.StreamMessageWriter = exports.StreamMessageReader = exports.SocketMessageWriter = exports.SocketMessageReader = exports.PortMessageWriter = exports.PortMessageReader = exports.IPCMessageWriter = exports.IPCMessageReader = void 0;
  const ril_1 = ril;
  ril_1.default.install();
  const path = require$$1$1;
  const os = require$$2;
  const crypto_1 = crypto;
  const net_1 = require$$4$1;
  const api_1 = requireApi();
  __exportStar(requireApi(), exports);
  class IPCMessageReader extends api_1.AbstractMessageReader {
    constructor(process) {
      super();
      this.process = process;
      let eventEmitter = this.process;
      eventEmitter.on('error', (error => this.fireError(error)));
      eventEmitter.on('close', (() => this.fireClose()));
    }
    listen(callback) {
      this.process.on('message', callback);
      return api_1.Disposable.create((() => this.process.off('message', callback)));
    }
  }
  exports.IPCMessageReader = IPCMessageReader;
  class IPCMessageWriter extends api_1.AbstractMessageWriter {
    constructor(process) {
      super();
      this.process = process;
      this.errorCount = 0;
      const eventEmitter = this.process;
      eventEmitter.on('error', (error => this.fireError(error)));
      eventEmitter.on('close', (() => this.fireClose));
    }
    write(msg) {
      try {
        if (typeof this.process.send === 'function') {
          this.process.send(msg, undefined, undefined, (error => {
            if (error) {
              this.errorCount++;
              this.handleError(error, msg);
            } else {
              this.errorCount = 0;
            }
          }));
        }
        return Promise.resolve();
      } catch (error) {
        this.handleError(error, msg);
        return Promise.reject(error);
      }
    }
    handleError(error, msg) {
      this.errorCount++;
      this.fireError(error, msg, this.errorCount);
    }
    end() {}
  }
  exports.IPCMessageWriter = IPCMessageWriter;
  class PortMessageReader extends api_1.AbstractMessageReader {
    constructor(port) {
      super();
      this.onData = new api_1.Emitter;
      port.on('close', (() => this.fireClose));
      port.on('error', (error => this.fireError(error)));
      port.on('message', (message => {
        this.onData.fire(message);
      }));
    }
    listen(callback) {
      return this.onData.event(callback);
    }
  }
  exports.PortMessageReader = PortMessageReader;
  class PortMessageWriter extends api_1.AbstractMessageWriter {
    constructor(port) {
      super();
      this.port = port;
      this.errorCount = 0;
      port.on('close', (() => this.fireClose()));
      port.on('error', (error => this.fireError(error)));
    }
    write(msg) {
      try {
        this.port.postMessage(msg);
        return Promise.resolve();
      } catch (error) {
        this.handleError(error, msg);
        return Promise.reject(error);
      }
    }
    handleError(error, msg) {
      this.errorCount++;
      this.fireError(error, msg, this.errorCount);
    }
    end() {}
  }
  exports.PortMessageWriter = PortMessageWriter;
  class SocketMessageReader extends api_1.ReadableStreamMessageReader {
    constructor(socket, encoding = 'utf-8') {
      super((0, ril_1.default)().stream.asReadableStream(socket), encoding);
    }
  }
  exports.SocketMessageReader = SocketMessageReader;
  class SocketMessageWriter extends api_1.WriteableStreamMessageWriter {
    constructor(socket, options) {
      super((0, ril_1.default)().stream.asWritableStream(socket), options);
      this.socket = socket;
    }
    dispose() {
      super.dispose();
      this.socket.destroy();
    }
  }
  exports.SocketMessageWriter = SocketMessageWriter;
  class StreamMessageReader extends api_1.ReadableStreamMessageReader {
    constructor(readable, encoding) {
      super((0, ril_1.default)().stream.asReadableStream(readable), encoding);
    }
  }
  exports.StreamMessageReader = StreamMessageReader;
  class StreamMessageWriter extends api_1.WriteableStreamMessageWriter {
    constructor(writable, options) {
      super((0, ril_1.default)().stream.asWritableStream(writable), options);
    }
  }
  exports.StreamMessageWriter = StreamMessageWriter;
  const XDG_RUNTIME_DIR = process.env['XDG_RUNTIME_DIR'];
  const safeIpcPathLengths = new Map([ [ 'linux', 107 ], [ 'darwin', 103 ] ]);
  function generateRandomPipeName() {
    const randomSuffix = (0, crypto_1.randomBytes)(21).toString('hex');
    if (process.platform === 'win32') {
      return `\\\\.\\pipe\\vscode-jsonrpc-${randomSuffix}-sock`;
    }
    let result;
    if (XDG_RUNTIME_DIR) {
      result = path.join(XDG_RUNTIME_DIR, `vscode-ipc-${randomSuffix}.sock`);
    } else {
      result = path.join(os.tmpdir(), `vscode-${randomSuffix}.sock`);
    }
    const limit = safeIpcPathLengths.get(process.platform);
    if (limit !== undefined && result.length > limit) {
      (0, ril_1.default)().console.warn(`WARNING: IPC handle "${result}" is longer than ${limit} characters.`);
    }
    return result;
  }
  exports.generateRandomPipeName = generateRandomPipeName;
  function createClientPipeTransport(pipeName, encoding = 'utf-8') {
    let connectResolve;
    const connected = new Promise(((resolve, _reject) => {
      connectResolve = resolve;
    }));
    return new Promise(((resolve, reject) => {
      let server = (0, net_1.createServer)((socket => {
        server.close();
        connectResolve([ new SocketMessageReader(socket, encoding), new SocketMessageWriter(socket, encoding) ]);
      }));
      server.on('error', reject);
      server.listen(pipeName, (() => {
        server.removeListener('error', reject);
        resolve({
          onConnected: () => connected
        });
      }));
    }));
  }
  exports.createClientPipeTransport = createClientPipeTransport;
  function createServerPipeTransport(pipeName, encoding = 'utf-8') {
    const socket = (0, net_1.createConnection)(pipeName);
    return [ new SocketMessageReader(socket, encoding), new SocketMessageWriter(socket, encoding) ];
  }
  exports.createServerPipeTransport = createServerPipeTransport;
  function createClientSocketTransport(port, encoding = 'utf-8') {
    let connectResolve;
    const connected = new Promise(((resolve, _reject) => {
      connectResolve = resolve;
    }));
    return new Promise(((resolve, reject) => {
      const server = (0, net_1.createServer)((socket => {
        server.close();
        connectResolve([ new SocketMessageReader(socket, encoding), new SocketMessageWriter(socket, encoding) ]);
      }));
      server.on('error', reject);
      server.listen(port, '127.0.0.1', (() => {
        server.removeListener('error', reject);
        resolve({
          onConnected: () => connected
        });
      }));
    }));
  }
  exports.createClientSocketTransport = createClientSocketTransport;
  function createServerSocketTransport(port, encoding = 'utf-8') {
    const socket = (0, net_1.createConnection)(port, '127.0.0.1');
    return [ new SocketMessageReader(socket, encoding), new SocketMessageWriter(socket, encoding) ];
  }
  exports.createServerSocketTransport = createServerSocketTransport;
  function isReadableStream(value) {
    const candidate = value;
    return candidate.read !== undefined && candidate.addListener !== undefined;
  }
  function isWritableStream(value) {
    const candidate = value;
    return candidate.write !== undefined && candidate.addListener !== undefined;
  }
  function createMessageConnection(input, output, logger, options) {
    if (!logger) {
      logger = api_1.NullLogger;
    }
    const reader = isReadableStream(input) ? new StreamMessageReader(input) : input;
    const writer = isWritableStream(output) ? new StreamMessageWriter(output) : output;
    if (api_1.ConnectionStrategy.is(options)) {
      options = {
        connectionStrategy: options
      };
    }
    return (0, api_1.createMessageConnection)(reader, writer, logger, options);
  }
  exports.createMessageConnection = createMessageConnection;
})(main$1);

var node$2 = main$1;

var api$1 = {};

function commonjsRequire(path) {
  throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

var main = {
  exports: {}
};

(function(module, exports) {
  (function(factory) {
    {
      var v = factory(commonjsRequire, exports);
      if (v !== undefined) module.exports = v;
    }
  })((function(require, exports) {
    Object.defineProperty(exports, '__esModule', {
      value: true
    });
    exports.TextDocument = exports.EOL = exports.WorkspaceFolder = exports.InlineCompletionContext = exports.SelectedCompletionInfo = exports.InlineCompletionTriggerKind = exports.InlineCompletionList = exports.InlineCompletionItem = exports.StringValue = exports.InlayHint = exports.InlayHintLabelPart = exports.InlayHintKind = exports.InlineValueContext = exports.InlineValueEvaluatableExpression = exports.InlineValueVariableLookup = exports.InlineValueText = exports.SemanticTokens = exports.SemanticTokenModifiers = exports.SemanticTokenTypes = exports.SelectionRange = exports.DocumentLink = exports.FormattingOptions = exports.CodeLens = exports.CodeAction = exports.CodeActionContext = exports.CodeActionTriggerKind = exports.CodeActionKind = exports.DocumentSymbol = exports.WorkspaceSymbol = exports.SymbolInformation = exports.SymbolTag = exports.SymbolKind = exports.DocumentHighlight = exports.DocumentHighlightKind = exports.SignatureInformation = exports.ParameterInformation = exports.Hover = exports.MarkedString = exports.CompletionList = exports.CompletionItem = exports.CompletionItemLabelDetails = exports.InsertTextMode = exports.InsertReplaceEdit = exports.CompletionItemTag = exports.InsertTextFormat = exports.CompletionItemKind = exports.MarkupContent = exports.MarkupKind = exports.TextDocumentItem = exports.OptionalVersionedTextDocumentIdentifier = exports.VersionedTextDocumentIdentifier = exports.TextDocumentIdentifier = exports.WorkspaceChange = exports.WorkspaceEdit = exports.DeleteFile = exports.RenameFile = exports.CreateFile = exports.TextDocumentEdit = exports.AnnotatedTextEdit = exports.ChangeAnnotationIdentifier = exports.ChangeAnnotation = exports.TextEdit = exports.Command = exports.Diagnostic = exports.CodeDescription = exports.DiagnosticTag = exports.DiagnosticSeverity = exports.DiagnosticRelatedInformation = exports.FoldingRange = exports.FoldingRangeKind = exports.ColorPresentation = exports.ColorInformation = exports.Color = exports.LocationLink = exports.Location = exports.Range = exports.Position = exports.uinteger = exports.integer = exports.URI = exports.DocumentUri = void 0;
    var DocumentUri;
    (function(DocumentUri) {
      function is(value) {
        return typeof value === 'string';
      }
      DocumentUri.is = is;
    })(DocumentUri || (exports.DocumentUri = DocumentUri = {}));
    var URI;
    (function(URI) {
      function is(value) {
        return typeof value === 'string';
      }
      URI.is = is;
    })(URI || (exports.URI = URI = {}));
    var integer;
    (function(integer) {
      integer.MIN_VALUE = -2147483648;
      integer.MAX_VALUE = 2147483647;
      function is(value) {
        return typeof value === 'number' && integer.MIN_VALUE <= value && value <= integer.MAX_VALUE;
      }
      integer.is = is;
    })(integer || (exports.integer = integer = {}));
    var uinteger;
    (function(uinteger) {
      uinteger.MIN_VALUE = 0;
      uinteger.MAX_VALUE = 2147483647;
      function is(value) {
        return typeof value === 'number' && uinteger.MIN_VALUE <= value && value <= uinteger.MAX_VALUE;
      }
      uinteger.is = is;
    })(uinteger || (exports.uinteger = uinteger = {}));
    var Position;
    (function(Position) {
      function create(line, character) {
        if (line === Number.MAX_VALUE) {
          line = uinteger.MAX_VALUE;
        }
        if (character === Number.MAX_VALUE) {
          character = uinteger.MAX_VALUE;
        }
        return {
          line: line,
          character: character
        };
      }
      Position.create = create;
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Is.uinteger(candidate.line) && Is.uinteger(candidate.character);
      }
      Position.is = is;
    })(Position || (exports.Position = Position = {}));
    var Range;
    (function(Range) {
      function create(one, two, three, four) {
        if (Is.uinteger(one) && Is.uinteger(two) && Is.uinteger(three) && Is.uinteger(four)) {
          return {
            start: Position.create(one, two),
            end: Position.create(three, four)
          };
        } else if (Position.is(one) && Position.is(two)) {
          return {
            start: one,
            end: two
          };
        } else {
          throw new Error('Range#create called with invalid arguments['.concat(one, ', ').concat(two, ', ').concat(three, ', ').concat(four, ']'));
        }
      }
      Range.create = create;
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Position.is(candidate.start) && Position.is(candidate.end);
      }
      Range.is = is;
    })(Range || (exports.Range = Range = {}));
    var Location;
    (function(Location) {
      function create(uri, range) {
        return {
          uri: uri,
          range: range
        };
      }
      Location.create = create;
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Range.is(candidate.range) && (Is.string(candidate.uri) || Is.undefined(candidate.uri));
      }
      Location.is = is;
    })(Location || (exports.Location = Location = {}));
    var LocationLink;
    (function(LocationLink) {
      function create(targetUri, targetRange, targetSelectionRange, originSelectionRange) {
        return {
          targetUri: targetUri,
          targetRange: targetRange,
          targetSelectionRange: targetSelectionRange,
          originSelectionRange: originSelectionRange
        };
      }
      LocationLink.create = create;
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Range.is(candidate.targetRange) && Is.string(candidate.targetUri) && Range.is(candidate.targetSelectionRange) && (Range.is(candidate.originSelectionRange) || Is.undefined(candidate.originSelectionRange));
      }
      LocationLink.is = is;
    })(LocationLink || (exports.LocationLink = LocationLink = {}));
    var Color;
    (function(Color) {
      function create(red, green, blue, alpha) {
        return {
          red: red,
          green: green,
          blue: blue,
          alpha: alpha
        };
      }
      Color.create = create;
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Is.numberRange(candidate.red, 0, 1) && Is.numberRange(candidate.green, 0, 1) && Is.numberRange(candidate.blue, 0, 1) && Is.numberRange(candidate.alpha, 0, 1);
      }
      Color.is = is;
    })(Color || (exports.Color = Color = {}));
    var ColorInformation;
    (function(ColorInformation) {
      function create(range, color) {
        return {
          range: range,
          color: color
        };
      }
      ColorInformation.create = create;
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Range.is(candidate.range) && Color.is(candidate.color);
      }
      ColorInformation.is = is;
    })(ColorInformation || (exports.ColorInformation = ColorInformation = {}));
    var ColorPresentation;
    (function(ColorPresentation) {
      function create(label, textEdit, additionalTextEdits) {
        return {
          label: label,
          textEdit: textEdit,
          additionalTextEdits: additionalTextEdits
        };
      }
      ColorPresentation.create = create;
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Is.string(candidate.label) && (Is.undefined(candidate.textEdit) || TextEdit.is(candidate)) && (Is.undefined(candidate.additionalTextEdits) || Is.typedArray(candidate.additionalTextEdits, TextEdit.is));
      }
      ColorPresentation.is = is;
    })(ColorPresentation || (exports.ColorPresentation = ColorPresentation = {}));
    var FoldingRangeKind;
    (function(FoldingRangeKind) {
      FoldingRangeKind.Comment = 'comment';
      FoldingRangeKind.Imports = 'imports';
      FoldingRangeKind.Region = 'region';
    })(FoldingRangeKind || (exports.FoldingRangeKind = FoldingRangeKind = {}));
    var FoldingRange;
    (function(FoldingRange) {
      function create(startLine, endLine, startCharacter, endCharacter, kind, collapsedText) {
        var result = {
          startLine: startLine,
          endLine: endLine
        };
        if (Is.defined(startCharacter)) {
          result.startCharacter = startCharacter;
        }
        if (Is.defined(endCharacter)) {
          result.endCharacter = endCharacter;
        }
        if (Is.defined(kind)) {
          result.kind = kind;
        }
        if (Is.defined(collapsedText)) {
          result.collapsedText = collapsedText;
        }
        return result;
      }
      FoldingRange.create = create;
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Is.uinteger(candidate.startLine) && Is.uinteger(candidate.startLine) && (Is.undefined(candidate.startCharacter) || Is.uinteger(candidate.startCharacter)) && (Is.undefined(candidate.endCharacter) || Is.uinteger(candidate.endCharacter)) && (Is.undefined(candidate.kind) || Is.string(candidate.kind));
      }
      FoldingRange.is = is;
    })(FoldingRange || (exports.FoldingRange = FoldingRange = {}));
    var DiagnosticRelatedInformation;
    (function(DiagnosticRelatedInformation) {
      function create(location, message) {
        return {
          location: location,
          message: message
        };
      }
      DiagnosticRelatedInformation.create = create;
      function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Location.is(candidate.location) && Is.string(candidate.message);
      }
      DiagnosticRelatedInformation.is = is;
    })(DiagnosticRelatedInformation || (exports.DiagnosticRelatedInformation = DiagnosticRelatedInformation = {}));
    var DiagnosticSeverity;
    (function(DiagnosticSeverity) {
      DiagnosticSeverity.Error = 1;
      DiagnosticSeverity.Warning = 2;
      DiagnosticSeverity.Information = 3;
      DiagnosticSeverity.Hint = 4;
    })(DiagnosticSeverity || (exports.DiagnosticSeverity = DiagnosticSeverity = {}));
    var DiagnosticTag;
    (function(DiagnosticTag) {
      DiagnosticTag.Unnecessary = 1;
      DiagnosticTag.Deprecated = 2;
    })(DiagnosticTag || (exports.DiagnosticTag = DiagnosticTag = {}));
    var CodeDescription;
    (function(CodeDescription) {
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Is.string(candidate.href);
      }
      CodeDescription.is = is;
    })(CodeDescription || (exports.CodeDescription = CodeDescription = {}));
    var Diagnostic;
    (function(Diagnostic) {
      function create(range, message, severity, code, source, relatedInformation) {
        var result = {
          range: range,
          message: message
        };
        if (Is.defined(severity)) {
          result.severity = severity;
        }
        if (Is.defined(code)) {
          result.code = code;
        }
        if (Is.defined(source)) {
          result.source = source;
        }
        if (Is.defined(relatedInformation)) {
          result.relatedInformation = relatedInformation;
        }
        return result;
      }
      Diagnostic.create = create;
      function is(value) {
        var _a;
        var candidate = value;
        return Is.defined(candidate) && Range.is(candidate.range) && Is.string(candidate.message) && (Is.number(candidate.severity) || Is.undefined(candidate.severity)) && (Is.integer(candidate.code) || Is.string(candidate.code) || Is.undefined(candidate.code)) && (Is.undefined(candidate.codeDescription) || Is.string((_a = candidate.codeDescription) === null || _a === void 0 ? void 0 : _a.href)) && (Is.string(candidate.source) || Is.undefined(candidate.source)) && (Is.undefined(candidate.relatedInformation) || Is.typedArray(candidate.relatedInformation, DiagnosticRelatedInformation.is));
      }
      Diagnostic.is = is;
    })(Diagnostic || (exports.Diagnostic = Diagnostic = {}));
    var Command;
    (function(Command) {
      function create(title, command) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
          args[_i - 2] = arguments[_i];
        }
        var result = {
          title: title,
          command: command
        };
        if (Is.defined(args) && args.length > 0) {
          result.arguments = args;
        }
        return result;
      }
      Command.create = create;
      function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.string(candidate.title) && Is.string(candidate.command);
      }
      Command.is = is;
    })(Command || (exports.Command = Command = {}));
    var TextEdit;
    (function(TextEdit) {
      function replace(range, newText) {
        return {
          range: range,
          newText: newText
        };
      }
      TextEdit.replace = replace;
      function insert(position, newText) {
        return {
          range: {
            start: position,
            end: position
          },
          newText: newText
        };
      }
      TextEdit.insert = insert;
      function del(range) {
        return {
          range: range,
          newText: ''
        };
      }
      TextEdit.del = del;
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Is.string(candidate.newText) && Range.is(candidate.range);
      }
      TextEdit.is = is;
    })(TextEdit || (exports.TextEdit = TextEdit = {}));
    var ChangeAnnotation;
    (function(ChangeAnnotation) {
      function create(label, needsConfirmation, description) {
        var result = {
          label: label
        };
        if (needsConfirmation !== undefined) {
          result.needsConfirmation = needsConfirmation;
        }
        if (description !== undefined) {
          result.description = description;
        }
        return result;
      }
      ChangeAnnotation.create = create;
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Is.string(candidate.label) && (Is.boolean(candidate.needsConfirmation) || candidate.needsConfirmation === undefined) && (Is.string(candidate.description) || candidate.description === undefined);
      }
      ChangeAnnotation.is = is;
    })(ChangeAnnotation || (exports.ChangeAnnotation = ChangeAnnotation = {}));
    var ChangeAnnotationIdentifier;
    (function(ChangeAnnotationIdentifier) {
      function is(value) {
        var candidate = value;
        return Is.string(candidate);
      }
      ChangeAnnotationIdentifier.is = is;
    })(ChangeAnnotationIdentifier || (exports.ChangeAnnotationIdentifier = ChangeAnnotationIdentifier = {}));
    var AnnotatedTextEdit;
    (function(AnnotatedTextEdit) {
      function replace(range, newText, annotation) {
        return {
          range: range,
          newText: newText,
          annotationId: annotation
        };
      }
      AnnotatedTextEdit.replace = replace;
      function insert(position, newText, annotation) {
        return {
          range: {
            start: position,
            end: position
          },
          newText: newText,
          annotationId: annotation
        };
      }
      AnnotatedTextEdit.insert = insert;
      function del(range, annotation) {
        return {
          range: range,
          newText: '',
          annotationId: annotation
        };
      }
      AnnotatedTextEdit.del = del;
      function is(value) {
        var candidate = value;
        return TextEdit.is(candidate) && (ChangeAnnotation.is(candidate.annotationId) || ChangeAnnotationIdentifier.is(candidate.annotationId));
      }
      AnnotatedTextEdit.is = is;
    })(AnnotatedTextEdit || (exports.AnnotatedTextEdit = AnnotatedTextEdit = {}));
    var TextDocumentEdit;
    (function(TextDocumentEdit) {
      function create(textDocument, edits) {
        return {
          textDocument: textDocument,
          edits: edits
        };
      }
      TextDocumentEdit.create = create;
      function is(value) {
        var candidate = value;
        return Is.defined(candidate) && OptionalVersionedTextDocumentIdentifier.is(candidate.textDocument) && Array.isArray(candidate.edits);
      }
      TextDocumentEdit.is = is;
    })(TextDocumentEdit || (exports.TextDocumentEdit = TextDocumentEdit = {}));
    var CreateFile;
    (function(CreateFile) {
      function create(uri, options, annotation) {
        var result = {
          kind: 'create',
          uri: uri
        };
        if (options !== undefined && (options.overwrite !== undefined || options.ignoreIfExists !== undefined)) {
          result.options = options;
        }
        if (annotation !== undefined) {
          result.annotationId = annotation;
        }
        return result;
      }
      CreateFile.create = create;
      function is(value) {
        var candidate = value;
        return candidate && candidate.kind === 'create' && Is.string(candidate.uri) && (candidate.options === undefined || (candidate.options.overwrite === undefined || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === undefined || Is.boolean(candidate.options.ignoreIfExists))) && (candidate.annotationId === undefined || ChangeAnnotationIdentifier.is(candidate.annotationId));
      }
      CreateFile.is = is;
    })(CreateFile || (exports.CreateFile = CreateFile = {}));
    var RenameFile;
    (function(RenameFile) {
      function create(oldUri, newUri, options, annotation) {
        var result = {
          kind: 'rename',
          oldUri: oldUri,
          newUri: newUri
        };
        if (options !== undefined && (options.overwrite !== undefined || options.ignoreIfExists !== undefined)) {
          result.options = options;
        }
        if (annotation !== undefined) {
          result.annotationId = annotation;
        }
        return result;
      }
      RenameFile.create = create;
      function is(value) {
        var candidate = value;
        return candidate && candidate.kind === 'rename' && Is.string(candidate.oldUri) && Is.string(candidate.newUri) && (candidate.options === undefined || (candidate.options.overwrite === undefined || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === undefined || Is.boolean(candidate.options.ignoreIfExists))) && (candidate.annotationId === undefined || ChangeAnnotationIdentifier.is(candidate.annotationId));
      }
      RenameFile.is = is;
    })(RenameFile || (exports.RenameFile = RenameFile = {}));
    var DeleteFile;
    (function(DeleteFile) {
      function create(uri, options, annotation) {
        var result = {
          kind: 'delete',
          uri: uri
        };
        if (options !== undefined && (options.recursive !== undefined || options.ignoreIfNotExists !== undefined)) {
          result.options = options;
        }
        if (annotation !== undefined) {
          result.annotationId = annotation;
        }
        return result;
      }
      DeleteFile.create = create;
      function is(value) {
        var candidate = value;
        return candidate && candidate.kind === 'delete' && Is.string(candidate.uri) && (candidate.options === undefined || (candidate.options.recursive === undefined || Is.boolean(candidate.options.recursive)) && (candidate.options.ignoreIfNotExists === undefined || Is.boolean(candidate.options.ignoreIfNotExists))) && (candidate.annotationId === undefined || ChangeAnnotationIdentifier.is(candidate.annotationId));
      }
      DeleteFile.is = is;
    })(DeleteFile || (exports.DeleteFile = DeleteFile = {}));
    var WorkspaceEdit;
    (function(WorkspaceEdit) {
      function is(value) {
        var candidate = value;
        return candidate && (candidate.changes !== undefined || candidate.documentChanges !== undefined) && (candidate.documentChanges === undefined || candidate.documentChanges.every((function(change) {
          if (Is.string(change.kind)) {
            return CreateFile.is(change) || RenameFile.is(change) || DeleteFile.is(change);
          } else {
            return TextDocumentEdit.is(change);
          }
        })));
      }
      WorkspaceEdit.is = is;
    })(WorkspaceEdit || (exports.WorkspaceEdit = WorkspaceEdit = {}));
    var TextEditChangeImpl = function() {
      function TextEditChangeImpl(edits, changeAnnotations) {
        this.edits = edits;
        this.changeAnnotations = changeAnnotations;
      }
      TextEditChangeImpl.prototype.insert = function(position, newText, annotation) {
        var edit;
        var id;
        if (annotation === undefined) {
          edit = TextEdit.insert(position, newText);
        } else if (ChangeAnnotationIdentifier.is(annotation)) {
          id = annotation;
          edit = AnnotatedTextEdit.insert(position, newText, annotation);
        } else {
          this.assertChangeAnnotations(this.changeAnnotations);
          id = this.changeAnnotations.manage(annotation);
          edit = AnnotatedTextEdit.insert(position, newText, id);
        }
        this.edits.push(edit);
        if (id !== undefined) {
          return id;
        }
      };
      TextEditChangeImpl.prototype.replace = function(range, newText, annotation) {
        var edit;
        var id;
        if (annotation === undefined) {
          edit = TextEdit.replace(range, newText);
        } else if (ChangeAnnotationIdentifier.is(annotation)) {
          id = annotation;
          edit = AnnotatedTextEdit.replace(range, newText, annotation);
        } else {
          this.assertChangeAnnotations(this.changeAnnotations);
          id = this.changeAnnotations.manage(annotation);
          edit = AnnotatedTextEdit.replace(range, newText, id);
        }
        this.edits.push(edit);
        if (id !== undefined) {
          return id;
        }
      };
      TextEditChangeImpl.prototype.delete = function(range, annotation) {
        var edit;
        var id;
        if (annotation === undefined) {
          edit = TextEdit.del(range);
        } else if (ChangeAnnotationIdentifier.is(annotation)) {
          id = annotation;
          edit = AnnotatedTextEdit.del(range, annotation);
        } else {
          this.assertChangeAnnotations(this.changeAnnotations);
          id = this.changeAnnotations.manage(annotation);
          edit = AnnotatedTextEdit.del(range, id);
        }
        this.edits.push(edit);
        if (id !== undefined) {
          return id;
        }
      };
      TextEditChangeImpl.prototype.add = function(edit) {
        this.edits.push(edit);
      };
      TextEditChangeImpl.prototype.all = function() {
        return this.edits;
      };
      TextEditChangeImpl.prototype.clear = function() {
        this.edits.splice(0, this.edits.length);
      };
      TextEditChangeImpl.prototype.assertChangeAnnotations = function(value) {
        if (value === undefined) {
          throw new Error('Text edit change is not configured to manage change annotations.');
        }
      };
      return TextEditChangeImpl;
    }();
    var ChangeAnnotations = function() {
      function ChangeAnnotations(annotations) {
        this._annotations = annotations === undefined ? Object.create(null) : annotations;
        this._counter = 0;
        this._size = 0;
      }
      ChangeAnnotations.prototype.all = function() {
        return this._annotations;
      };
      Object.defineProperty(ChangeAnnotations.prototype, 'size', {
        get: function() {
          return this._size;
        },
        enumerable: false,
        configurable: true
      });
      ChangeAnnotations.prototype.manage = function(idOrAnnotation, annotation) {
        var id;
        if (ChangeAnnotationIdentifier.is(idOrAnnotation)) {
          id = idOrAnnotation;
        } else {
          id = this.nextId();
          annotation = idOrAnnotation;
        }
        if (this._annotations[id] !== undefined) {
          throw new Error('Id '.concat(id, ' is already in use.'));
        }
        if (annotation === undefined) {
          throw new Error('No annotation provided for id '.concat(id));
        }
        this._annotations[id] = annotation;
        this._size++;
        return id;
      };
      ChangeAnnotations.prototype.nextId = function() {
        this._counter++;
        return this._counter.toString();
      };
      return ChangeAnnotations;
    }();
    var WorkspaceChange = function() {
      function WorkspaceChange(workspaceEdit) {
        var _this = this;
        this._textEditChanges = Object.create(null);
        if (workspaceEdit !== undefined) {
          this._workspaceEdit = workspaceEdit;
          if (workspaceEdit.documentChanges) {
            this._changeAnnotations = new ChangeAnnotations(workspaceEdit.changeAnnotations);
            workspaceEdit.changeAnnotations = this._changeAnnotations.all();
            workspaceEdit.documentChanges.forEach((function(change) {
              if (TextDocumentEdit.is(change)) {
                var textEditChange = new TextEditChangeImpl(change.edits, _this._changeAnnotations);
                _this._textEditChanges[change.textDocument.uri] = textEditChange;
              }
            }));
          } else if (workspaceEdit.changes) {
            Object.keys(workspaceEdit.changes).forEach((function(key) {
              var textEditChange = new TextEditChangeImpl(workspaceEdit.changes[key]);
              _this._textEditChanges[key] = textEditChange;
            }));
          }
        } else {
          this._workspaceEdit = {};
        }
      }
      Object.defineProperty(WorkspaceChange.prototype, 'edit', {
        get: function() {
          this.initDocumentChanges();
          if (this._changeAnnotations !== undefined) {
            if (this._changeAnnotations.size === 0) {
              this._workspaceEdit.changeAnnotations = undefined;
            } else {
              this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
            }
          }
          return this._workspaceEdit;
        },
        enumerable: false,
        configurable: true
      });
      WorkspaceChange.prototype.getTextEditChange = function(key) {
        if (OptionalVersionedTextDocumentIdentifier.is(key)) {
          this.initDocumentChanges();
          if (this._workspaceEdit.documentChanges === undefined) {
            throw new Error('Workspace edit is not configured for document changes.');
          }
          var textDocument = {
            uri: key.uri,
            version: key.version
          };
          var result = this._textEditChanges[textDocument.uri];
          if (!result) {
            var edits = [];
            var textDocumentEdit = {
              textDocument: textDocument,
              edits: edits
            };
            this._workspaceEdit.documentChanges.push(textDocumentEdit);
            result = new TextEditChangeImpl(edits, this._changeAnnotations);
            this._textEditChanges[textDocument.uri] = result;
          }
          return result;
        } else {
          this.initChanges();
          if (this._workspaceEdit.changes === undefined) {
            throw new Error('Workspace edit is not configured for normal text edit changes.');
          }
          var result = this._textEditChanges[key];
          if (!result) {
            var edits = [];
            this._workspaceEdit.changes[key] = edits;
            result = new TextEditChangeImpl(edits);
            this._textEditChanges[key] = result;
          }
          return result;
        }
      };
      WorkspaceChange.prototype.initDocumentChanges = function() {
        if (this._workspaceEdit.documentChanges === undefined && this._workspaceEdit.changes === undefined) {
          this._changeAnnotations = new ChangeAnnotations;
          this._workspaceEdit.documentChanges = [];
          this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
        }
      };
      WorkspaceChange.prototype.initChanges = function() {
        if (this._workspaceEdit.documentChanges === undefined && this._workspaceEdit.changes === undefined) {
          this._workspaceEdit.changes = Object.create(null);
        }
      };
      WorkspaceChange.prototype.createFile = function(uri, optionsOrAnnotation, options) {
        this.initDocumentChanges();
        if (this._workspaceEdit.documentChanges === undefined) {
          throw new Error('Workspace edit is not configured for document changes.');
        }
        var annotation;
        if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
          annotation = optionsOrAnnotation;
        } else {
          options = optionsOrAnnotation;
        }
        var operation;
        var id;
        if (annotation === undefined) {
          operation = CreateFile.create(uri, options);
        } else {
          id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
          operation = CreateFile.create(uri, options, id);
        }
        this._workspaceEdit.documentChanges.push(operation);
        if (id !== undefined) {
          return id;
        }
      };
      WorkspaceChange.prototype.renameFile = function(oldUri, newUri, optionsOrAnnotation, options) {
        this.initDocumentChanges();
        if (this._workspaceEdit.documentChanges === undefined) {
          throw new Error('Workspace edit is not configured for document changes.');
        }
        var annotation;
        if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
          annotation = optionsOrAnnotation;
        } else {
          options = optionsOrAnnotation;
        }
        var operation;
        var id;
        if (annotation === undefined) {
          operation = RenameFile.create(oldUri, newUri, options);
        } else {
          id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
          operation = RenameFile.create(oldUri, newUri, options, id);
        }
        this._workspaceEdit.documentChanges.push(operation);
        if (id !== undefined) {
          return id;
        }
      };
      WorkspaceChange.prototype.deleteFile = function(uri, optionsOrAnnotation, options) {
        this.initDocumentChanges();
        if (this._workspaceEdit.documentChanges === undefined) {
          throw new Error('Workspace edit is not configured for document changes.');
        }
        var annotation;
        if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
          annotation = optionsOrAnnotation;
        } else {
          options = optionsOrAnnotation;
        }
        var operation;
        var id;
        if (annotation === undefined) {
          operation = DeleteFile.create(uri, options);
        } else {
          id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
          operation = DeleteFile.create(uri, options, id);
        }
        this._workspaceEdit.documentChanges.push(operation);
        if (id !== undefined) {
          return id;
        }
      };
      return WorkspaceChange;
    }();
    exports.WorkspaceChange = WorkspaceChange;
    var TextDocumentIdentifier;
    (function(TextDocumentIdentifier) {
      function create(uri) {
        return {
          uri: uri
        };
      }
      TextDocumentIdentifier.create = create;
      function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.string(candidate.uri);
      }
      TextDocumentIdentifier.is = is;
    })(TextDocumentIdentifier || (exports.TextDocumentIdentifier = TextDocumentIdentifier = {}));
    var VersionedTextDocumentIdentifier;
    (function(VersionedTextDocumentIdentifier) {
      function create(uri, version) {
        return {
          uri: uri,
          version: version
        };
      }
      VersionedTextDocumentIdentifier.create = create;
      function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.string(candidate.uri) && Is.integer(candidate.version);
      }
      VersionedTextDocumentIdentifier.is = is;
    })(VersionedTextDocumentIdentifier || (exports.VersionedTextDocumentIdentifier = VersionedTextDocumentIdentifier = {}));
    var OptionalVersionedTextDocumentIdentifier;
    (function(OptionalVersionedTextDocumentIdentifier) {
      function create(uri, version) {
        return {
          uri: uri,
          version: version
        };
      }
      OptionalVersionedTextDocumentIdentifier.create = create;
      function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.string(candidate.uri) && (candidate.version === null || Is.integer(candidate.version));
      }
      OptionalVersionedTextDocumentIdentifier.is = is;
    })(OptionalVersionedTextDocumentIdentifier || (exports.OptionalVersionedTextDocumentIdentifier = OptionalVersionedTextDocumentIdentifier = {}));
    var TextDocumentItem;
    (function(TextDocumentItem) {
      function create(uri, languageId, version, text) {
        return {
          uri: uri,
          languageId: languageId,
          version: version,
          text: text
        };
      }
      TextDocumentItem.create = create;
      function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.string(candidate.uri) && Is.string(candidate.languageId) && Is.integer(candidate.version) && Is.string(candidate.text);
      }
      TextDocumentItem.is = is;
    })(TextDocumentItem || (exports.TextDocumentItem = TextDocumentItem = {}));
    var MarkupKind;
    (function(MarkupKind) {
      MarkupKind.PlainText = 'plaintext';
      MarkupKind.Markdown = 'markdown';
      function is(value) {
        var candidate = value;
        return candidate === MarkupKind.PlainText || candidate === MarkupKind.Markdown;
      }
      MarkupKind.is = is;
    })(MarkupKind || (exports.MarkupKind = MarkupKind = {}));
    var MarkupContent;
    (function(MarkupContent) {
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(value) && MarkupKind.is(candidate.kind) && Is.string(candidate.value);
      }
      MarkupContent.is = is;
    })(MarkupContent || (exports.MarkupContent = MarkupContent = {}));
    var CompletionItemKind;
    (function(CompletionItemKind) {
      CompletionItemKind.Text = 1;
      CompletionItemKind.Method = 2;
      CompletionItemKind.Function = 3;
      CompletionItemKind.Constructor = 4;
      CompletionItemKind.Field = 5;
      CompletionItemKind.Variable = 6;
      CompletionItemKind.Class = 7;
      CompletionItemKind.Interface = 8;
      CompletionItemKind.Module = 9;
      CompletionItemKind.Property = 10;
      CompletionItemKind.Unit = 11;
      CompletionItemKind.Value = 12;
      CompletionItemKind.Enum = 13;
      CompletionItemKind.Keyword = 14;
      CompletionItemKind.Snippet = 15;
      CompletionItemKind.Color = 16;
      CompletionItemKind.File = 17;
      CompletionItemKind.Reference = 18;
      CompletionItemKind.Folder = 19;
      CompletionItemKind.EnumMember = 20;
      CompletionItemKind.Constant = 21;
      CompletionItemKind.Struct = 22;
      CompletionItemKind.Event = 23;
      CompletionItemKind.Operator = 24;
      CompletionItemKind.TypeParameter = 25;
    })(CompletionItemKind || (exports.CompletionItemKind = CompletionItemKind = {}));
    var InsertTextFormat;
    (function(InsertTextFormat) {
      InsertTextFormat.PlainText = 1;
      InsertTextFormat.Snippet = 2;
    })(InsertTextFormat || (exports.InsertTextFormat = InsertTextFormat = {}));
    var CompletionItemTag;
    (function(CompletionItemTag) {
      CompletionItemTag.Deprecated = 1;
    })(CompletionItemTag || (exports.CompletionItemTag = CompletionItemTag = {}));
    var InsertReplaceEdit;
    (function(InsertReplaceEdit) {
      function create(newText, insert, replace) {
        return {
          newText: newText,
          insert: insert,
          replace: replace
        };
      }
      InsertReplaceEdit.create = create;
      function is(value) {
        var candidate = value;
        return candidate && Is.string(candidate.newText) && Range.is(candidate.insert) && Range.is(candidate.replace);
      }
      InsertReplaceEdit.is = is;
    })(InsertReplaceEdit || (exports.InsertReplaceEdit = InsertReplaceEdit = {}));
    var InsertTextMode;
    (function(InsertTextMode) {
      InsertTextMode.asIs = 1;
      InsertTextMode.adjustIndentation = 2;
    })(InsertTextMode || (exports.InsertTextMode = InsertTextMode = {}));
    var CompletionItemLabelDetails;
    (function(CompletionItemLabelDetails) {
      function is(value) {
        var candidate = value;
        return candidate && (Is.string(candidate.detail) || candidate.detail === undefined) && (Is.string(candidate.description) || candidate.description === undefined);
      }
      CompletionItemLabelDetails.is = is;
    })(CompletionItemLabelDetails || (exports.CompletionItemLabelDetails = CompletionItemLabelDetails = {}));
    var CompletionItem;
    (function(CompletionItem) {
      function create(label) {
        return {
          label: label
        };
      }
      CompletionItem.create = create;
    })(CompletionItem || (exports.CompletionItem = CompletionItem = {}));
    var CompletionList;
    (function(CompletionList) {
      function create(items, isIncomplete) {
        return {
          items: items ? items : [],
          isIncomplete: !!isIncomplete
        };
      }
      CompletionList.create = create;
    })(CompletionList || (exports.CompletionList = CompletionList = {}));
    var MarkedString;
    (function(MarkedString) {
      function fromPlainText(plainText) {
        return plainText.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
      }
      MarkedString.fromPlainText = fromPlainText;
      function is(value) {
        var candidate = value;
        return Is.string(candidate) || Is.objectLiteral(candidate) && Is.string(candidate.language) && Is.string(candidate.value);
      }
      MarkedString.is = is;
    })(MarkedString || (exports.MarkedString = MarkedString = {}));
    var Hover;
    (function(Hover) {
      function is(value) {
        var candidate = value;
        return !!candidate && Is.objectLiteral(candidate) && (MarkupContent.is(candidate.contents) || MarkedString.is(candidate.contents) || Is.typedArray(candidate.contents, MarkedString.is)) && (value.range === undefined || Range.is(value.range));
      }
      Hover.is = is;
    })(Hover || (exports.Hover = Hover = {}));
    var ParameterInformation;
    (function(ParameterInformation) {
      function create(label, documentation) {
        return documentation ? {
          label: label,
          documentation: documentation
        } : {
          label: label
        };
      }
      ParameterInformation.create = create;
    })(ParameterInformation || (exports.ParameterInformation = ParameterInformation = {}));
    var SignatureInformation;
    (function(SignatureInformation) {
      function create(label, documentation) {
        var parameters = [];
        for (var _i = 2; _i < arguments.length; _i++) {
          parameters[_i - 2] = arguments[_i];
        }
        var result = {
          label: label
        };
        if (Is.defined(documentation)) {
          result.documentation = documentation;
        }
        if (Is.defined(parameters)) {
          result.parameters = parameters;
        } else {
          result.parameters = [];
        }
        return result;
      }
      SignatureInformation.create = create;
    })(SignatureInformation || (exports.SignatureInformation = SignatureInformation = {}));
    var DocumentHighlightKind;
    (function(DocumentHighlightKind) {
      DocumentHighlightKind.Text = 1;
      DocumentHighlightKind.Read = 2;
      DocumentHighlightKind.Write = 3;
    })(DocumentHighlightKind || (exports.DocumentHighlightKind = DocumentHighlightKind = {}));
    var DocumentHighlight;
    (function(DocumentHighlight) {
      function create(range, kind) {
        var result = {
          range: range
        };
        if (Is.number(kind)) {
          result.kind = kind;
        }
        return result;
      }
      DocumentHighlight.create = create;
    })(DocumentHighlight || (exports.DocumentHighlight = DocumentHighlight = {}));
    var SymbolKind;
    (function(SymbolKind) {
      SymbolKind.File = 1;
      SymbolKind.Module = 2;
      SymbolKind.Namespace = 3;
      SymbolKind.Package = 4;
      SymbolKind.Class = 5;
      SymbolKind.Method = 6;
      SymbolKind.Property = 7;
      SymbolKind.Field = 8;
      SymbolKind.Constructor = 9;
      SymbolKind.Enum = 10;
      SymbolKind.Interface = 11;
      SymbolKind.Function = 12;
      SymbolKind.Variable = 13;
      SymbolKind.Constant = 14;
      SymbolKind.String = 15;
      SymbolKind.Number = 16;
      SymbolKind.Boolean = 17;
      SymbolKind.Array = 18;
      SymbolKind.Object = 19;
      SymbolKind.Key = 20;
      SymbolKind.Null = 21;
      SymbolKind.EnumMember = 22;
      SymbolKind.Struct = 23;
      SymbolKind.Event = 24;
      SymbolKind.Operator = 25;
      SymbolKind.TypeParameter = 26;
    })(SymbolKind || (exports.SymbolKind = SymbolKind = {}));
    var SymbolTag;
    (function(SymbolTag) {
      SymbolTag.Deprecated = 1;
    })(SymbolTag || (exports.SymbolTag = SymbolTag = {}));
    var SymbolInformation;
    (function(SymbolInformation) {
      function create(name, kind, range, uri, containerName) {
        var result = {
          name: name,
          kind: kind,
          location: {
            uri: uri,
            range: range
          }
        };
        if (containerName) {
          result.containerName = containerName;
        }
        return result;
      }
      SymbolInformation.create = create;
    })(SymbolInformation || (exports.SymbolInformation = SymbolInformation = {}));
    var WorkspaceSymbol;
    (function(WorkspaceSymbol) {
      function create(name, kind, uri, range) {
        return range !== undefined ? {
          name: name,
          kind: kind,
          location: {
            uri: uri,
            range: range
          }
        } : {
          name: name,
          kind: kind,
          location: {
            uri: uri
          }
        };
      }
      WorkspaceSymbol.create = create;
    })(WorkspaceSymbol || (exports.WorkspaceSymbol = WorkspaceSymbol = {}));
    var DocumentSymbol;
    (function(DocumentSymbol) {
      function create(name, detail, kind, range, selectionRange, children) {
        var result = {
          name: name,
          detail: detail,
          kind: kind,
          range: range,
          selectionRange: selectionRange
        };
        if (children !== undefined) {
          result.children = children;
        }
        return result;
      }
      DocumentSymbol.create = create;
      function is(value) {
        var candidate = value;
        return candidate && Is.string(candidate.name) && Is.number(candidate.kind) && Range.is(candidate.range) && Range.is(candidate.selectionRange) && (candidate.detail === undefined || Is.string(candidate.detail)) && (candidate.deprecated === undefined || Is.boolean(candidate.deprecated)) && (candidate.children === undefined || Array.isArray(candidate.children)) && (candidate.tags === undefined || Array.isArray(candidate.tags));
      }
      DocumentSymbol.is = is;
    })(DocumentSymbol || (exports.DocumentSymbol = DocumentSymbol = {}));
    var CodeActionKind;
    (function(CodeActionKind) {
      CodeActionKind.Empty = '';
      CodeActionKind.QuickFix = 'quickfix';
      CodeActionKind.Refactor = 'refactor';
      CodeActionKind.RefactorExtract = 'refactor.extract';
      CodeActionKind.RefactorInline = 'refactor.inline';
      CodeActionKind.RefactorRewrite = 'refactor.rewrite';
      CodeActionKind.Source = 'source';
      CodeActionKind.SourceOrganizeImports = 'source.organizeImports';
      CodeActionKind.SourceFixAll = 'source.fixAll';
    })(CodeActionKind || (exports.CodeActionKind = CodeActionKind = {}));
    var CodeActionTriggerKind;
    (function(CodeActionTriggerKind) {
      CodeActionTriggerKind.Invoked = 1;
      CodeActionTriggerKind.Automatic = 2;
    })(CodeActionTriggerKind || (exports.CodeActionTriggerKind = CodeActionTriggerKind = {}));
    var CodeActionContext;
    (function(CodeActionContext) {
      function create(diagnostics, only, triggerKind) {
        var result = {
          diagnostics: diagnostics
        };
        if (only !== undefined && only !== null) {
          result.only = only;
        }
        if (triggerKind !== undefined && triggerKind !== null) {
          result.triggerKind = triggerKind;
        }
        return result;
      }
      CodeActionContext.create = create;
      function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.typedArray(candidate.diagnostics, Diagnostic.is) && (candidate.only === undefined || Is.typedArray(candidate.only, Is.string)) && (candidate.triggerKind === undefined || candidate.triggerKind === CodeActionTriggerKind.Invoked || candidate.triggerKind === CodeActionTriggerKind.Automatic);
      }
      CodeActionContext.is = is;
    })(CodeActionContext || (exports.CodeActionContext = CodeActionContext = {}));
    var CodeAction;
    (function(CodeAction) {
      function create(title, kindOrCommandOrEdit, kind) {
        var result = {
          title: title
        };
        var checkKind = true;
        if (typeof kindOrCommandOrEdit === 'string') {
          checkKind = false;
          result.kind = kindOrCommandOrEdit;
        } else if (Command.is(kindOrCommandOrEdit)) {
          result.command = kindOrCommandOrEdit;
        } else {
          result.edit = kindOrCommandOrEdit;
        }
        if (checkKind && kind !== undefined) {
          result.kind = kind;
        }
        return result;
      }
      CodeAction.create = create;
      function is(value) {
        var candidate = value;
        return candidate && Is.string(candidate.title) && (candidate.diagnostics === undefined || Is.typedArray(candidate.diagnostics, Diagnostic.is)) && (candidate.kind === undefined || Is.string(candidate.kind)) && (candidate.edit !== undefined || candidate.command !== undefined) && (candidate.command === undefined || Command.is(candidate.command)) && (candidate.isPreferred === undefined || Is.boolean(candidate.isPreferred)) && (candidate.edit === undefined || WorkspaceEdit.is(candidate.edit));
      }
      CodeAction.is = is;
    })(CodeAction || (exports.CodeAction = CodeAction = {}));
    var CodeLens;
    (function(CodeLens) {
      function create(range, data) {
        var result = {
          range: range
        };
        if (Is.defined(data)) {
          result.data = data;
        }
        return result;
      }
      CodeLens.create = create;
      function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.command) || Command.is(candidate.command));
      }
      CodeLens.is = is;
    })(CodeLens || (exports.CodeLens = CodeLens = {}));
    var FormattingOptions;
    (function(FormattingOptions) {
      function create(tabSize, insertSpaces) {
        return {
          tabSize: tabSize,
          insertSpaces: insertSpaces
        };
      }
      FormattingOptions.create = create;
      function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.uinteger(candidate.tabSize) && Is.boolean(candidate.insertSpaces);
      }
      FormattingOptions.is = is;
    })(FormattingOptions || (exports.FormattingOptions = FormattingOptions = {}));
    var DocumentLink;
    (function(DocumentLink) {
      function create(range, target, data) {
        return {
          range: range,
          target: target,
          data: data
        };
      }
      DocumentLink.create = create;
      function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.target) || Is.string(candidate.target));
      }
      DocumentLink.is = is;
    })(DocumentLink || (exports.DocumentLink = DocumentLink = {}));
    var SelectionRange;
    (function(SelectionRange) {
      function create(range, parent) {
        return {
          range: range,
          parent: parent
        };
      }
      SelectionRange.create = create;
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Range.is(candidate.range) && (candidate.parent === undefined || SelectionRange.is(candidate.parent));
      }
      SelectionRange.is = is;
    })(SelectionRange || (exports.SelectionRange = SelectionRange = {}));
    var SemanticTokenTypes;
    (function(SemanticTokenTypes) {
      SemanticTokenTypes['namespace'] = 'namespace';
      SemanticTokenTypes['type'] = 'type';
      SemanticTokenTypes['class'] = 'class';
      SemanticTokenTypes['enum'] = 'enum';
      SemanticTokenTypes['interface'] = 'interface';
      SemanticTokenTypes['struct'] = 'struct';
      SemanticTokenTypes['typeParameter'] = 'typeParameter';
      SemanticTokenTypes['parameter'] = 'parameter';
      SemanticTokenTypes['variable'] = 'variable';
      SemanticTokenTypes['property'] = 'property';
      SemanticTokenTypes['enumMember'] = 'enumMember';
      SemanticTokenTypes['event'] = 'event';
      SemanticTokenTypes['function'] = 'function';
      SemanticTokenTypes['method'] = 'method';
      SemanticTokenTypes['macro'] = 'macro';
      SemanticTokenTypes['keyword'] = 'keyword';
      SemanticTokenTypes['modifier'] = 'modifier';
      SemanticTokenTypes['comment'] = 'comment';
      SemanticTokenTypes['string'] = 'string';
      SemanticTokenTypes['number'] = 'number';
      SemanticTokenTypes['regexp'] = 'regexp';
      SemanticTokenTypes['operator'] = 'operator';
      SemanticTokenTypes['decorator'] = 'decorator';
    })(SemanticTokenTypes || (exports.SemanticTokenTypes = SemanticTokenTypes = {}));
    var SemanticTokenModifiers;
    (function(SemanticTokenModifiers) {
      SemanticTokenModifiers['declaration'] = 'declaration';
      SemanticTokenModifiers['definition'] = 'definition';
      SemanticTokenModifiers['readonly'] = 'readonly';
      SemanticTokenModifiers['static'] = 'static';
      SemanticTokenModifiers['deprecated'] = 'deprecated';
      SemanticTokenModifiers['abstract'] = 'abstract';
      SemanticTokenModifiers['async'] = 'async';
      SemanticTokenModifiers['modification'] = 'modification';
      SemanticTokenModifiers['documentation'] = 'documentation';
      SemanticTokenModifiers['defaultLibrary'] = 'defaultLibrary';
    })(SemanticTokenModifiers || (exports.SemanticTokenModifiers = SemanticTokenModifiers = {}));
    var SemanticTokens;
    (function(SemanticTokens) {
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && (candidate.resultId === undefined || typeof candidate.resultId === 'string') && Array.isArray(candidate.data) && (candidate.data.length === 0 || typeof candidate.data[0] === 'number');
      }
      SemanticTokens.is = is;
    })(SemanticTokens || (exports.SemanticTokens = SemanticTokens = {}));
    var InlineValueText;
    (function(InlineValueText) {
      function create(range, text) {
        return {
          range: range,
          text: text
        };
      }
      InlineValueText.create = create;
      function is(value) {
        var candidate = value;
        return candidate !== undefined && candidate !== null && Range.is(candidate.range) && Is.string(candidate.text);
      }
      InlineValueText.is = is;
    })(InlineValueText || (exports.InlineValueText = InlineValueText = {}));
    var InlineValueVariableLookup;
    (function(InlineValueVariableLookup) {
      function create(range, variableName, caseSensitiveLookup) {
        return {
          range: range,
          variableName: variableName,
          caseSensitiveLookup: caseSensitiveLookup
        };
      }
      InlineValueVariableLookup.create = create;
      function is(value) {
        var candidate = value;
        return candidate !== undefined && candidate !== null && Range.is(candidate.range) && Is.boolean(candidate.caseSensitiveLookup) && (Is.string(candidate.variableName) || candidate.variableName === undefined);
      }
      InlineValueVariableLookup.is = is;
    })(InlineValueVariableLookup || (exports.InlineValueVariableLookup = InlineValueVariableLookup = {}));
    var InlineValueEvaluatableExpression;
    (function(InlineValueEvaluatableExpression) {
      function create(range, expression) {
        return {
          range: range,
          expression: expression
        };
      }
      InlineValueEvaluatableExpression.create = create;
      function is(value) {
        var candidate = value;
        return candidate !== undefined && candidate !== null && Range.is(candidate.range) && (Is.string(candidate.expression) || candidate.expression === undefined);
      }
      InlineValueEvaluatableExpression.is = is;
    })(InlineValueEvaluatableExpression || (exports.InlineValueEvaluatableExpression = InlineValueEvaluatableExpression = {}));
    var InlineValueContext;
    (function(InlineValueContext) {
      function create(frameId, stoppedLocation) {
        return {
          frameId: frameId,
          stoppedLocation: stoppedLocation
        };
      }
      InlineValueContext.create = create;
      function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Range.is(value.stoppedLocation);
      }
      InlineValueContext.is = is;
    })(InlineValueContext || (exports.InlineValueContext = InlineValueContext = {}));
    var InlayHintKind;
    (function(InlayHintKind) {
      InlayHintKind.Type = 1;
      InlayHintKind.Parameter = 2;
      function is(value) {
        return value === 1 || value === 2;
      }
      InlayHintKind.is = is;
    })(InlayHintKind || (exports.InlayHintKind = InlayHintKind = {}));
    var InlayHintLabelPart;
    (function(InlayHintLabelPart) {
      function create(value) {
        return {
          value: value
        };
      }
      InlayHintLabelPart.create = create;
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && (candidate.tooltip === undefined || Is.string(candidate.tooltip) || MarkupContent.is(candidate.tooltip)) && (candidate.location === undefined || Location.is(candidate.location)) && (candidate.command === undefined || Command.is(candidate.command));
      }
      InlayHintLabelPart.is = is;
    })(InlayHintLabelPart || (exports.InlayHintLabelPart = InlayHintLabelPart = {}));
    var InlayHint;
    (function(InlayHint) {
      function create(position, label, kind) {
        var result = {
          position: position,
          label: label
        };
        if (kind !== undefined) {
          result.kind = kind;
        }
        return result;
      }
      InlayHint.create = create;
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && Position.is(candidate.position) && (Is.string(candidate.label) || Is.typedArray(candidate.label, InlayHintLabelPart.is)) && (candidate.kind === undefined || InlayHintKind.is(candidate.kind)) && candidate.textEdits === undefined || Is.typedArray(candidate.textEdits, TextEdit.is) && (candidate.tooltip === undefined || Is.string(candidate.tooltip) || MarkupContent.is(candidate.tooltip)) && (candidate.paddingLeft === undefined || Is.boolean(candidate.paddingLeft)) && (candidate.paddingRight === undefined || Is.boolean(candidate.paddingRight));
      }
      InlayHint.is = is;
    })(InlayHint || (exports.InlayHint = InlayHint = {}));
    var StringValue;
    (function(StringValue) {
      function createSnippet(value) {
        return {
          kind: 'snippet',
          value: value
        };
      }
      StringValue.createSnippet = createSnippet;
    })(StringValue || (exports.StringValue = StringValue = {}));
    var InlineCompletionItem;
    (function(InlineCompletionItem) {
      function create(insertText, filterText, range, command) {
        return {
          insertText: insertText,
          filterText: filterText,
          range: range,
          command: command
        };
      }
      InlineCompletionItem.create = create;
    })(InlineCompletionItem || (exports.InlineCompletionItem = InlineCompletionItem = {}));
    var InlineCompletionList;
    (function(InlineCompletionList) {
      function create(items) {
        return {
          items: items
        };
      }
      InlineCompletionList.create = create;
    })(InlineCompletionList || (exports.InlineCompletionList = InlineCompletionList = {}));
    var InlineCompletionTriggerKind;
    (function(InlineCompletionTriggerKind) {
      InlineCompletionTriggerKind.Invoked = 0;
      InlineCompletionTriggerKind.Automatic = 1;
    })(InlineCompletionTriggerKind || (exports.InlineCompletionTriggerKind = InlineCompletionTriggerKind = {}));
    var SelectedCompletionInfo;
    (function(SelectedCompletionInfo) {
      function create(range, text) {
        return {
          range: range,
          text: text
        };
      }
      SelectedCompletionInfo.create = create;
    })(SelectedCompletionInfo || (exports.SelectedCompletionInfo = SelectedCompletionInfo = {}));
    var InlineCompletionContext;
    (function(InlineCompletionContext) {
      function create(triggerKind, selectedCompletionInfo) {
        return {
          triggerKind: triggerKind,
          selectedCompletionInfo: selectedCompletionInfo
        };
      }
      InlineCompletionContext.create = create;
    })(InlineCompletionContext || (exports.InlineCompletionContext = InlineCompletionContext = {}));
    var WorkspaceFolder;
    (function(WorkspaceFolder) {
      function is(value) {
        var candidate = value;
        return Is.objectLiteral(candidate) && URI.is(candidate.uri) && Is.string(candidate.name);
      }
      WorkspaceFolder.is = is;
    })(WorkspaceFolder || (exports.WorkspaceFolder = WorkspaceFolder = {}));
    exports.EOL = [ '\n', '\r\n', '\r' ];
    var TextDocument;
    (function(TextDocument) {
      function create(uri, languageId, version, content) {
        return new FullTextDocument(uri, languageId, version, content);
      }
      TextDocument.create = create;
      function is(value) {
        var candidate = value;
        return Is.defined(candidate) && Is.string(candidate.uri) && (Is.undefined(candidate.languageId) || Is.string(candidate.languageId)) && Is.uinteger(candidate.lineCount) && Is.func(candidate.getText) && Is.func(candidate.positionAt) && Is.func(candidate.offsetAt) ? true : false;
      }
      TextDocument.is = is;
      function applyEdits(document, edits) {
        var text = document.getText();
        var sortedEdits = mergeSort(edits, (function(a, b) {
          var diff = a.range.start.line - b.range.start.line;
          if (diff === 0) {
            return a.range.start.character - b.range.start.character;
          }
          return diff;
        }));
        var lastModifiedOffset = text.length;
        for (var i = sortedEdits.length - 1; i >= 0; i--) {
          var e = sortedEdits[i];
          var startOffset = document.offsetAt(e.range.start);
          var endOffset = document.offsetAt(e.range.end);
          if (endOffset <= lastModifiedOffset) {
            text = text.substring(0, startOffset) + e.newText + text.substring(endOffset, text.length);
          } else {
            throw new Error('Overlapping edit');
          }
          lastModifiedOffset = startOffset;
        }
        return text;
      }
      TextDocument.applyEdits = applyEdits;
      function mergeSort(data, compare) {
        if (data.length <= 1) {
          return data;
        }
        var p = data.length / 2 | 0;
        var left = data.slice(0, p);
        var right = data.slice(p);
        mergeSort(left, compare);
        mergeSort(right, compare);
        var leftIdx = 0;
        var rightIdx = 0;
        var i = 0;
        while (leftIdx < left.length && rightIdx < right.length) {
          var ret = compare(left[leftIdx], right[rightIdx]);
          if (ret <= 0) {
            data[i++] = left[leftIdx++];
          } else {
            data[i++] = right[rightIdx++];
          }
        }
        while (leftIdx < left.length) {
          data[i++] = left[leftIdx++];
        }
        while (rightIdx < right.length) {
          data[i++] = right[rightIdx++];
        }
        return data;
      }
    })(TextDocument || (exports.TextDocument = TextDocument = {}));
    var FullTextDocument = function() {
      function FullTextDocument(uri, languageId, version, content) {
        this._uri = uri;
        this._languageId = languageId;
        this._version = version;
        this._content = content;
        this._lineOffsets = undefined;
      }
      Object.defineProperty(FullTextDocument.prototype, 'uri', {
        get: function() {
          return this._uri;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(FullTextDocument.prototype, 'languageId', {
        get: function() {
          return this._languageId;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(FullTextDocument.prototype, 'version', {
        get: function() {
          return this._version;
        },
        enumerable: false,
        configurable: true
      });
      FullTextDocument.prototype.getText = function(range) {
        if (range) {
          var start = this.offsetAt(range.start);
          var end = this.offsetAt(range.end);
          return this._content.substring(start, end);
        }
        return this._content;
      };
      FullTextDocument.prototype.update = function(event, version) {
        this._content = event.text;
        this._version = version;
        this._lineOffsets = undefined;
      };
      FullTextDocument.prototype.getLineOffsets = function() {
        if (this._lineOffsets === undefined) {
          var lineOffsets = [];
          var text = this._content;
          var isLineStart = true;
          for (var i = 0; i < text.length; i++) {
            if (isLineStart) {
              lineOffsets.push(i);
              isLineStart = false;
            }
            var ch = text.charAt(i);
            isLineStart = ch === '\r' || ch === '\n';
            if (ch === '\r' && i + 1 < text.length && text.charAt(i + 1) === '\n') {
              i++;
            }
          }
          if (isLineStart && text.length > 0) {
            lineOffsets.push(text.length);
          }
          this._lineOffsets = lineOffsets;
        }
        return this._lineOffsets;
      };
      FullTextDocument.prototype.positionAt = function(offset) {
        offset = Math.max(Math.min(offset, this._content.length), 0);
        var lineOffsets = this.getLineOffsets();
        var low = 0, high = lineOffsets.length;
        if (high === 0) {
          return Position.create(0, offset);
        }
        while (low < high) {
          var mid = Math.floor((low + high) / 2);
          if (lineOffsets[mid] > offset) {
            high = mid;
          } else {
            low = mid + 1;
          }
        }
        var line = low - 1;
        return Position.create(line, offset - lineOffsets[line]);
      };
      FullTextDocument.prototype.offsetAt = function(position) {
        var lineOffsets = this.getLineOffsets();
        if (position.line >= lineOffsets.length) {
          return this._content.length;
        } else if (position.line < 0) {
          return 0;
        }
        var lineOffset = lineOffsets[position.line];
        var nextLineOffset = position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : this._content.length;
        return Math.max(Math.min(lineOffset + position.character, nextLineOffset), lineOffset);
      };
      Object.defineProperty(FullTextDocument.prototype, 'lineCount', {
        get: function() {
          return this.getLineOffsets().length;
        },
        enumerable: false,
        configurable: true
      });
      return FullTextDocument;
    }();
    var Is;
    (function(Is) {
      var toString = Object.prototype.toString;
      function defined(value) {
        return typeof value !== 'undefined';
      }
      Is.defined = defined;
      function undefined$1(value) {
        return typeof value === 'undefined';
      }
      Is.undefined = undefined$1;
      function boolean(value) {
        return value === true || value === false;
      }
      Is.boolean = boolean;
      function string(value) {
        return toString.call(value) === '[object String]';
      }
      Is.string = string;
      function number(value) {
        return toString.call(value) === '[object Number]';
      }
      Is.number = number;
      function numberRange(value, min, max) {
        return toString.call(value) === '[object Number]' && min <= value && value <= max;
      }
      Is.numberRange = numberRange;
      function integer(value) {
        return toString.call(value) === '[object Number]' && -2147483648 <= value && value <= 2147483647;
      }
      Is.integer = integer;
      function uinteger(value) {
        return toString.call(value) === '[object Number]' && 0 <= value && value <= 2147483647;
      }
      Is.uinteger = uinteger;
      function func(value) {
        return toString.call(value) === '[object Function]';
      }
      Is.func = func;
      function objectLiteral(value) {
        return value !== null && typeof value === 'object';
      }
      Is.objectLiteral = objectLiteral;
      function typedArray(value, check) {
        return Array.isArray(value) && value.every(check);
      }
      Is.typedArray = typedArray;
    })(Is || (Is = {}));
  }));
})(main, main.exports);

var mainExports = main.exports;

var messages = {};

Object.defineProperty(messages, '__esModule', {
  value: true
});

messages.ProtocolNotificationType = messages.ProtocolNotificationType0 = messages.ProtocolRequestType = messages.ProtocolRequestType0 = messages.RegistrationType = messages.MessageDirection = void 0;

const vscode_jsonrpc_1$3 = main$1;

var MessageDirection;

(function(MessageDirection) {
  MessageDirection['clientToServer'] = 'clientToServer';
  MessageDirection['serverToClient'] = 'serverToClient';
  MessageDirection['both'] = 'both';
})(MessageDirection || (messages.MessageDirection = MessageDirection = {}));

class RegistrationType {
  constructor(method) {
    this.method = method;
  }
}

messages.RegistrationType = RegistrationType;

class ProtocolRequestType0 extends vscode_jsonrpc_1$3.RequestType0 {
  constructor(method) {
    super(method);
  }
}

messages.ProtocolRequestType0 = ProtocolRequestType0;

class ProtocolRequestType extends vscode_jsonrpc_1$3.RequestType {
  constructor(method) {
    super(method, vscode_jsonrpc_1$3.ParameterStructures.byName);
  }
}

messages.ProtocolRequestType = ProtocolRequestType;

class ProtocolNotificationType0 extends vscode_jsonrpc_1$3.NotificationType0 {
  constructor(method) {
    super(method);
  }
}

messages.ProtocolNotificationType0 = ProtocolNotificationType0;

class ProtocolNotificationType extends vscode_jsonrpc_1$3.NotificationType {
  constructor(method) {
    super(method, vscode_jsonrpc_1$3.ParameterStructures.byName);
  }
}

messages.ProtocolNotificationType = ProtocolNotificationType;

var protocol = {};

var is = {};

Object.defineProperty(is, '__esModule', {
  value: true
});

is.objectLiteral = is.typedArray = is.stringArray = is.array = is.func = is.error = is.number = is.string = is.boolean = void 0;

function boolean(value) {
  return value === true || value === false;
}

is.boolean = boolean;

function string(value) {
  return typeof value === 'string' || value instanceof String;
}

is.string = string;

function number(value) {
  return typeof value === 'number' || value instanceof Number;
}

is.number = number;

function error(value) {
  return value instanceof Error;
}

is.error = error;

function func(value) {
  return typeof value === 'function';
}

is.func = func;

function array(value) {
  return Array.isArray(value);
}

is.array = array;

function stringArray(value) {
  return array(value) && value.every((elem => string(elem)));
}

is.stringArray = stringArray;

function typedArray(value, check) {
  return Array.isArray(value) && value.every(check);
}

is.typedArray = typedArray;

function objectLiteral(value) {
  return value !== null && typeof value === 'object';
}

is.objectLiteral = objectLiteral;

var protocol_implementation = {};

Object.defineProperty(protocol_implementation, '__esModule', {
  value: true
});

protocol_implementation.ImplementationRequest = void 0;

const messages_1$k = messages;

var ImplementationRequest;

(function(ImplementationRequest) {
  ImplementationRequest.method = 'textDocument/implementation';
  ImplementationRequest.messageDirection = messages_1$k.MessageDirection.clientToServer;
  ImplementationRequest.type = new messages_1$k.ProtocolRequestType(ImplementationRequest.method);
})(ImplementationRequest || (protocol_implementation.ImplementationRequest = ImplementationRequest = {}));

var protocol_typeDefinition = {};

Object.defineProperty(protocol_typeDefinition, '__esModule', {
  value: true
});

protocol_typeDefinition.TypeDefinitionRequest = void 0;

const messages_1$j = messages;

var TypeDefinitionRequest;

(function(TypeDefinitionRequest) {
  TypeDefinitionRequest.method = 'textDocument/typeDefinition';
  TypeDefinitionRequest.messageDirection = messages_1$j.MessageDirection.clientToServer;
  TypeDefinitionRequest.type = new messages_1$j.ProtocolRequestType(TypeDefinitionRequest.method);
})(TypeDefinitionRequest || (protocol_typeDefinition.TypeDefinitionRequest = TypeDefinitionRequest = {}));

var protocol_workspaceFolder = {};

Object.defineProperty(protocol_workspaceFolder, '__esModule', {
  value: true
});

protocol_workspaceFolder.DidChangeWorkspaceFoldersNotification = protocol_workspaceFolder.WorkspaceFoldersRequest = void 0;

const messages_1$i = messages;

var WorkspaceFoldersRequest;

(function(WorkspaceFoldersRequest) {
  WorkspaceFoldersRequest.method = 'workspace/workspaceFolders';
  WorkspaceFoldersRequest.messageDirection = messages_1$i.MessageDirection.serverToClient;
  WorkspaceFoldersRequest.type = new messages_1$i.ProtocolRequestType0(WorkspaceFoldersRequest.method);
})(WorkspaceFoldersRequest || (protocol_workspaceFolder.WorkspaceFoldersRequest = WorkspaceFoldersRequest = {}));

var DidChangeWorkspaceFoldersNotification;

(function(DidChangeWorkspaceFoldersNotification) {
  DidChangeWorkspaceFoldersNotification.method = 'workspace/didChangeWorkspaceFolders';
  DidChangeWorkspaceFoldersNotification.messageDirection = messages_1$i.MessageDirection.clientToServer;
  DidChangeWorkspaceFoldersNotification.type = new messages_1$i.ProtocolNotificationType(DidChangeWorkspaceFoldersNotification.method);
})(DidChangeWorkspaceFoldersNotification || (protocol_workspaceFolder.DidChangeWorkspaceFoldersNotification = DidChangeWorkspaceFoldersNotification = {}));

var protocol_configuration = {};

Object.defineProperty(protocol_configuration, '__esModule', {
  value: true
});

protocol_configuration.ConfigurationRequest = void 0;

const messages_1$h = messages;

var ConfigurationRequest;

(function(ConfigurationRequest) {
  ConfigurationRequest.method = 'workspace/configuration';
  ConfigurationRequest.messageDirection = messages_1$h.MessageDirection.serverToClient;
  ConfigurationRequest.type = new messages_1$h.ProtocolRequestType(ConfigurationRequest.method);
})(ConfigurationRequest || (protocol_configuration.ConfigurationRequest = ConfigurationRequest = {}));

var protocol_colorProvider = {};

Object.defineProperty(protocol_colorProvider, '__esModule', {
  value: true
});

protocol_colorProvider.ColorPresentationRequest = protocol_colorProvider.DocumentColorRequest = void 0;

const messages_1$g = messages;

var DocumentColorRequest;

(function(DocumentColorRequest) {
  DocumentColorRequest.method = 'textDocument/documentColor';
  DocumentColorRequest.messageDirection = messages_1$g.MessageDirection.clientToServer;
  DocumentColorRequest.type = new messages_1$g.ProtocolRequestType(DocumentColorRequest.method);
})(DocumentColorRequest || (protocol_colorProvider.DocumentColorRequest = DocumentColorRequest = {}));

var ColorPresentationRequest;

(function(ColorPresentationRequest) {
  ColorPresentationRequest.method = 'textDocument/colorPresentation';
  ColorPresentationRequest.messageDirection = messages_1$g.MessageDirection.clientToServer;
  ColorPresentationRequest.type = new messages_1$g.ProtocolRequestType(ColorPresentationRequest.method);
})(ColorPresentationRequest || (protocol_colorProvider.ColorPresentationRequest = ColorPresentationRequest = {}));

var protocol_foldingRange = {};

Object.defineProperty(protocol_foldingRange, '__esModule', {
  value: true
});

protocol_foldingRange.FoldingRangeRefreshRequest = protocol_foldingRange.FoldingRangeRequest = void 0;

const messages_1$f = messages;

var FoldingRangeRequest;

(function(FoldingRangeRequest) {
  FoldingRangeRequest.method = 'textDocument/foldingRange';
  FoldingRangeRequest.messageDirection = messages_1$f.MessageDirection.clientToServer;
  FoldingRangeRequest.type = new messages_1$f.ProtocolRequestType(FoldingRangeRequest.method);
})(FoldingRangeRequest || (protocol_foldingRange.FoldingRangeRequest = FoldingRangeRequest = {}));

var FoldingRangeRefreshRequest;

(function(FoldingRangeRefreshRequest) {
  FoldingRangeRefreshRequest.method = `workspace/foldingRange/refresh`;
  FoldingRangeRefreshRequest.messageDirection = messages_1$f.MessageDirection.serverToClient;
  FoldingRangeRefreshRequest.type = new messages_1$f.ProtocolRequestType0(FoldingRangeRefreshRequest.method);
})(FoldingRangeRefreshRequest || (protocol_foldingRange.FoldingRangeRefreshRequest = FoldingRangeRefreshRequest = {}));

var protocol_declaration = {};

Object.defineProperty(protocol_declaration, '__esModule', {
  value: true
});

protocol_declaration.DeclarationRequest = void 0;

const messages_1$e = messages;

var DeclarationRequest;

(function(DeclarationRequest) {
  DeclarationRequest.method = 'textDocument/declaration';
  DeclarationRequest.messageDirection = messages_1$e.MessageDirection.clientToServer;
  DeclarationRequest.type = new messages_1$e.ProtocolRequestType(DeclarationRequest.method);
})(DeclarationRequest || (protocol_declaration.DeclarationRequest = DeclarationRequest = {}));

var protocol_selectionRange = {};

Object.defineProperty(protocol_selectionRange, '__esModule', {
  value: true
});

protocol_selectionRange.SelectionRangeRequest = void 0;

const messages_1$d = messages;

var SelectionRangeRequest;

(function(SelectionRangeRequest) {
  SelectionRangeRequest.method = 'textDocument/selectionRange';
  SelectionRangeRequest.messageDirection = messages_1$d.MessageDirection.clientToServer;
  SelectionRangeRequest.type = new messages_1$d.ProtocolRequestType(SelectionRangeRequest.method);
})(SelectionRangeRequest || (protocol_selectionRange.SelectionRangeRequest = SelectionRangeRequest = {}));

var protocol_progress = {};

Object.defineProperty(protocol_progress, '__esModule', {
  value: true
});

protocol_progress.WorkDoneProgressCancelNotification = protocol_progress.WorkDoneProgressCreateRequest = protocol_progress.WorkDoneProgress = void 0;

const vscode_jsonrpc_1$2 = main$1;

const messages_1$c = messages;

var WorkDoneProgress;

(function(WorkDoneProgress) {
  WorkDoneProgress.type = new vscode_jsonrpc_1$2.ProgressType;
  function is(value) {
    return value === WorkDoneProgress.type;
  }
  WorkDoneProgress.is = is;
})(WorkDoneProgress || (protocol_progress.WorkDoneProgress = WorkDoneProgress = {}));

var WorkDoneProgressCreateRequest;

(function(WorkDoneProgressCreateRequest) {
  WorkDoneProgressCreateRequest.method = 'window/workDoneProgress/create';
  WorkDoneProgressCreateRequest.messageDirection = messages_1$c.MessageDirection.serverToClient;
  WorkDoneProgressCreateRequest.type = new messages_1$c.ProtocolRequestType(WorkDoneProgressCreateRequest.method);
})(WorkDoneProgressCreateRequest || (protocol_progress.WorkDoneProgressCreateRequest = WorkDoneProgressCreateRequest = {}));

var WorkDoneProgressCancelNotification;

(function(WorkDoneProgressCancelNotification) {
  WorkDoneProgressCancelNotification.method = 'window/workDoneProgress/cancel';
  WorkDoneProgressCancelNotification.messageDirection = messages_1$c.MessageDirection.clientToServer;
  WorkDoneProgressCancelNotification.type = new messages_1$c.ProtocolNotificationType(WorkDoneProgressCancelNotification.method);
})(WorkDoneProgressCancelNotification || (protocol_progress.WorkDoneProgressCancelNotification = WorkDoneProgressCancelNotification = {}));

var protocol_callHierarchy = {};

Object.defineProperty(protocol_callHierarchy, '__esModule', {
  value: true
});

protocol_callHierarchy.CallHierarchyOutgoingCallsRequest = protocol_callHierarchy.CallHierarchyIncomingCallsRequest = protocol_callHierarchy.CallHierarchyPrepareRequest = void 0;

const messages_1$b = messages;

var CallHierarchyPrepareRequest;

(function(CallHierarchyPrepareRequest) {
  CallHierarchyPrepareRequest.method = 'textDocument/prepareCallHierarchy';
  CallHierarchyPrepareRequest.messageDirection = messages_1$b.MessageDirection.clientToServer;
  CallHierarchyPrepareRequest.type = new messages_1$b.ProtocolRequestType(CallHierarchyPrepareRequest.method);
})(CallHierarchyPrepareRequest || (protocol_callHierarchy.CallHierarchyPrepareRequest = CallHierarchyPrepareRequest = {}));

var CallHierarchyIncomingCallsRequest;

(function(CallHierarchyIncomingCallsRequest) {
  CallHierarchyIncomingCallsRequest.method = 'callHierarchy/incomingCalls';
  CallHierarchyIncomingCallsRequest.messageDirection = messages_1$b.MessageDirection.clientToServer;
  CallHierarchyIncomingCallsRequest.type = new messages_1$b.ProtocolRequestType(CallHierarchyIncomingCallsRequest.method);
})(CallHierarchyIncomingCallsRequest || (protocol_callHierarchy.CallHierarchyIncomingCallsRequest = CallHierarchyIncomingCallsRequest = {}));

var CallHierarchyOutgoingCallsRequest;

(function(CallHierarchyOutgoingCallsRequest) {
  CallHierarchyOutgoingCallsRequest.method = 'callHierarchy/outgoingCalls';
  CallHierarchyOutgoingCallsRequest.messageDirection = messages_1$b.MessageDirection.clientToServer;
  CallHierarchyOutgoingCallsRequest.type = new messages_1$b.ProtocolRequestType(CallHierarchyOutgoingCallsRequest.method);
})(CallHierarchyOutgoingCallsRequest || (protocol_callHierarchy.CallHierarchyOutgoingCallsRequest = CallHierarchyOutgoingCallsRequest = {}));

var protocol_semanticTokens = {};

Object.defineProperty(protocol_semanticTokens, '__esModule', {
  value: true
});

protocol_semanticTokens.SemanticTokensRefreshRequest = protocol_semanticTokens.SemanticTokensRangeRequest = protocol_semanticTokens.SemanticTokensDeltaRequest = protocol_semanticTokens.SemanticTokensRequest = protocol_semanticTokens.SemanticTokensRegistrationType = protocol_semanticTokens.TokenFormat = void 0;

const messages_1$a = messages;

var TokenFormat;

(function(TokenFormat) {
  TokenFormat.Relative = 'relative';
})(TokenFormat || (protocol_semanticTokens.TokenFormat = TokenFormat = {}));

var SemanticTokensRegistrationType;

(function(SemanticTokensRegistrationType) {
  SemanticTokensRegistrationType.method = 'textDocument/semanticTokens';
  SemanticTokensRegistrationType.type = new messages_1$a.RegistrationType(SemanticTokensRegistrationType.method);
})(SemanticTokensRegistrationType || (protocol_semanticTokens.SemanticTokensRegistrationType = SemanticTokensRegistrationType = {}));

var SemanticTokensRequest;

(function(SemanticTokensRequest) {
  SemanticTokensRequest.method = 'textDocument/semanticTokens/full';
  SemanticTokensRequest.messageDirection = messages_1$a.MessageDirection.clientToServer;
  SemanticTokensRequest.type = new messages_1$a.ProtocolRequestType(SemanticTokensRequest.method);
  SemanticTokensRequest.registrationMethod = SemanticTokensRegistrationType.method;
})(SemanticTokensRequest || (protocol_semanticTokens.SemanticTokensRequest = SemanticTokensRequest = {}));

var SemanticTokensDeltaRequest;

(function(SemanticTokensDeltaRequest) {
  SemanticTokensDeltaRequest.method = 'textDocument/semanticTokens/full/delta';
  SemanticTokensDeltaRequest.messageDirection = messages_1$a.MessageDirection.clientToServer;
  SemanticTokensDeltaRequest.type = new messages_1$a.ProtocolRequestType(SemanticTokensDeltaRequest.method);
  SemanticTokensDeltaRequest.registrationMethod = SemanticTokensRegistrationType.method;
})(SemanticTokensDeltaRequest || (protocol_semanticTokens.SemanticTokensDeltaRequest = SemanticTokensDeltaRequest = {}));

var SemanticTokensRangeRequest;

(function(SemanticTokensRangeRequest) {
  SemanticTokensRangeRequest.method = 'textDocument/semanticTokens/range';
  SemanticTokensRangeRequest.messageDirection = messages_1$a.MessageDirection.clientToServer;
  SemanticTokensRangeRequest.type = new messages_1$a.ProtocolRequestType(SemanticTokensRangeRequest.method);
  SemanticTokensRangeRequest.registrationMethod = SemanticTokensRegistrationType.method;
})(SemanticTokensRangeRequest || (protocol_semanticTokens.SemanticTokensRangeRequest = SemanticTokensRangeRequest = {}));

var SemanticTokensRefreshRequest;

(function(SemanticTokensRefreshRequest) {
  SemanticTokensRefreshRequest.method = `workspace/semanticTokens/refresh`;
  SemanticTokensRefreshRequest.messageDirection = messages_1$a.MessageDirection.serverToClient;
  SemanticTokensRefreshRequest.type = new messages_1$a.ProtocolRequestType0(SemanticTokensRefreshRequest.method);
})(SemanticTokensRefreshRequest || (protocol_semanticTokens.SemanticTokensRefreshRequest = SemanticTokensRefreshRequest = {}));

var protocol_showDocument = {};

Object.defineProperty(protocol_showDocument, '__esModule', {
  value: true
});

protocol_showDocument.ShowDocumentRequest = void 0;

const messages_1$9 = messages;

var ShowDocumentRequest;

(function(ShowDocumentRequest) {
  ShowDocumentRequest.method = 'window/showDocument';
  ShowDocumentRequest.messageDirection = messages_1$9.MessageDirection.serverToClient;
  ShowDocumentRequest.type = new messages_1$9.ProtocolRequestType(ShowDocumentRequest.method);
})(ShowDocumentRequest || (protocol_showDocument.ShowDocumentRequest = ShowDocumentRequest = {}));

var protocol_linkedEditingRange = {};

Object.defineProperty(protocol_linkedEditingRange, '__esModule', {
  value: true
});

protocol_linkedEditingRange.LinkedEditingRangeRequest = void 0;

const messages_1$8 = messages;

var LinkedEditingRangeRequest;

(function(LinkedEditingRangeRequest) {
  LinkedEditingRangeRequest.method = 'textDocument/linkedEditingRange';
  LinkedEditingRangeRequest.messageDirection = messages_1$8.MessageDirection.clientToServer;
  LinkedEditingRangeRequest.type = new messages_1$8.ProtocolRequestType(LinkedEditingRangeRequest.method);
})(LinkedEditingRangeRequest || (protocol_linkedEditingRange.LinkedEditingRangeRequest = LinkedEditingRangeRequest = {}));

var protocol_fileOperations = {};

Object.defineProperty(protocol_fileOperations, '__esModule', {
  value: true
});

protocol_fileOperations.WillDeleteFilesRequest = protocol_fileOperations.DidDeleteFilesNotification = protocol_fileOperations.DidRenameFilesNotification = protocol_fileOperations.WillRenameFilesRequest = protocol_fileOperations.DidCreateFilesNotification = protocol_fileOperations.WillCreateFilesRequest = protocol_fileOperations.FileOperationPatternKind = void 0;

const messages_1$7 = messages;

var FileOperationPatternKind;

(function(FileOperationPatternKind) {
  FileOperationPatternKind.file = 'file';
  FileOperationPatternKind.folder = 'folder';
})(FileOperationPatternKind || (protocol_fileOperations.FileOperationPatternKind = FileOperationPatternKind = {}));

var WillCreateFilesRequest;

(function(WillCreateFilesRequest) {
  WillCreateFilesRequest.method = 'workspace/willCreateFiles';
  WillCreateFilesRequest.messageDirection = messages_1$7.MessageDirection.clientToServer;
  WillCreateFilesRequest.type = new messages_1$7.ProtocolRequestType(WillCreateFilesRequest.method);
})(WillCreateFilesRequest || (protocol_fileOperations.WillCreateFilesRequest = WillCreateFilesRequest = {}));

var DidCreateFilesNotification;

(function(DidCreateFilesNotification) {
  DidCreateFilesNotification.method = 'workspace/didCreateFiles';
  DidCreateFilesNotification.messageDirection = messages_1$7.MessageDirection.clientToServer;
  DidCreateFilesNotification.type = new messages_1$7.ProtocolNotificationType(DidCreateFilesNotification.method);
})(DidCreateFilesNotification || (protocol_fileOperations.DidCreateFilesNotification = DidCreateFilesNotification = {}));

var WillRenameFilesRequest;

(function(WillRenameFilesRequest) {
  WillRenameFilesRequest.method = 'workspace/willRenameFiles';
  WillRenameFilesRequest.messageDirection = messages_1$7.MessageDirection.clientToServer;
  WillRenameFilesRequest.type = new messages_1$7.ProtocolRequestType(WillRenameFilesRequest.method);
})(WillRenameFilesRequest || (protocol_fileOperations.WillRenameFilesRequest = WillRenameFilesRequest = {}));

var DidRenameFilesNotification;

(function(DidRenameFilesNotification) {
  DidRenameFilesNotification.method = 'workspace/didRenameFiles';
  DidRenameFilesNotification.messageDirection = messages_1$7.MessageDirection.clientToServer;
  DidRenameFilesNotification.type = new messages_1$7.ProtocolNotificationType(DidRenameFilesNotification.method);
})(DidRenameFilesNotification || (protocol_fileOperations.DidRenameFilesNotification = DidRenameFilesNotification = {}));

var DidDeleteFilesNotification;

(function(DidDeleteFilesNotification) {
  DidDeleteFilesNotification.method = 'workspace/didDeleteFiles';
  DidDeleteFilesNotification.messageDirection = messages_1$7.MessageDirection.clientToServer;
  DidDeleteFilesNotification.type = new messages_1$7.ProtocolNotificationType(DidDeleteFilesNotification.method);
})(DidDeleteFilesNotification || (protocol_fileOperations.DidDeleteFilesNotification = DidDeleteFilesNotification = {}));

var WillDeleteFilesRequest;

(function(WillDeleteFilesRequest) {
  WillDeleteFilesRequest.method = 'workspace/willDeleteFiles';
  WillDeleteFilesRequest.messageDirection = messages_1$7.MessageDirection.clientToServer;
  WillDeleteFilesRequest.type = new messages_1$7.ProtocolRequestType(WillDeleteFilesRequest.method);
})(WillDeleteFilesRequest || (protocol_fileOperations.WillDeleteFilesRequest = WillDeleteFilesRequest = {}));

var protocol_moniker = {};

Object.defineProperty(protocol_moniker, '__esModule', {
  value: true
});

protocol_moniker.MonikerRequest = protocol_moniker.MonikerKind = protocol_moniker.UniquenessLevel = void 0;

const messages_1$6 = messages;

var UniquenessLevel;

(function(UniquenessLevel) {
  UniquenessLevel.document = 'document';
  UniquenessLevel.project = 'project';
  UniquenessLevel.group = 'group';
  UniquenessLevel.scheme = 'scheme';
  UniquenessLevel.global = 'global';
})(UniquenessLevel || (protocol_moniker.UniquenessLevel = UniquenessLevel = {}));

var MonikerKind;

(function(MonikerKind) {
  MonikerKind.$import = 'import';
  MonikerKind.$export = 'export';
  MonikerKind.local = 'local';
})(MonikerKind || (protocol_moniker.MonikerKind = MonikerKind = {}));

var MonikerRequest;

(function(MonikerRequest) {
  MonikerRequest.method = 'textDocument/moniker';
  MonikerRequest.messageDirection = messages_1$6.MessageDirection.clientToServer;
  MonikerRequest.type = new messages_1$6.ProtocolRequestType(MonikerRequest.method);
})(MonikerRequest || (protocol_moniker.MonikerRequest = MonikerRequest = {}));

var protocol_typeHierarchy = {};

Object.defineProperty(protocol_typeHierarchy, '__esModule', {
  value: true
});

protocol_typeHierarchy.TypeHierarchySubtypesRequest = protocol_typeHierarchy.TypeHierarchySupertypesRequest = protocol_typeHierarchy.TypeHierarchyPrepareRequest = void 0;

const messages_1$5 = messages;

var TypeHierarchyPrepareRequest;

(function(TypeHierarchyPrepareRequest) {
  TypeHierarchyPrepareRequest.method = 'textDocument/prepareTypeHierarchy';
  TypeHierarchyPrepareRequest.messageDirection = messages_1$5.MessageDirection.clientToServer;
  TypeHierarchyPrepareRequest.type = new messages_1$5.ProtocolRequestType(TypeHierarchyPrepareRequest.method);
})(TypeHierarchyPrepareRequest || (protocol_typeHierarchy.TypeHierarchyPrepareRequest = TypeHierarchyPrepareRequest = {}));

var TypeHierarchySupertypesRequest;

(function(TypeHierarchySupertypesRequest) {
  TypeHierarchySupertypesRequest.method = 'typeHierarchy/supertypes';
  TypeHierarchySupertypesRequest.messageDirection = messages_1$5.MessageDirection.clientToServer;
  TypeHierarchySupertypesRequest.type = new messages_1$5.ProtocolRequestType(TypeHierarchySupertypesRequest.method);
})(TypeHierarchySupertypesRequest || (protocol_typeHierarchy.TypeHierarchySupertypesRequest = TypeHierarchySupertypesRequest = {}));

var TypeHierarchySubtypesRequest;

(function(TypeHierarchySubtypesRequest) {
  TypeHierarchySubtypesRequest.method = 'typeHierarchy/subtypes';
  TypeHierarchySubtypesRequest.messageDirection = messages_1$5.MessageDirection.clientToServer;
  TypeHierarchySubtypesRequest.type = new messages_1$5.ProtocolRequestType(TypeHierarchySubtypesRequest.method);
})(TypeHierarchySubtypesRequest || (protocol_typeHierarchy.TypeHierarchySubtypesRequest = TypeHierarchySubtypesRequest = {}));

var protocol_inlineValue = {};

Object.defineProperty(protocol_inlineValue, '__esModule', {
  value: true
});

protocol_inlineValue.InlineValueRefreshRequest = protocol_inlineValue.InlineValueRequest = void 0;

const messages_1$4 = messages;

var InlineValueRequest;

(function(InlineValueRequest) {
  InlineValueRequest.method = 'textDocument/inlineValue';
  InlineValueRequest.messageDirection = messages_1$4.MessageDirection.clientToServer;
  InlineValueRequest.type = new messages_1$4.ProtocolRequestType(InlineValueRequest.method);
})(InlineValueRequest || (protocol_inlineValue.InlineValueRequest = InlineValueRequest = {}));

var InlineValueRefreshRequest;

(function(InlineValueRefreshRequest) {
  InlineValueRefreshRequest.method = `workspace/inlineValue/refresh`;
  InlineValueRefreshRequest.messageDirection = messages_1$4.MessageDirection.serverToClient;
  InlineValueRefreshRequest.type = new messages_1$4.ProtocolRequestType0(InlineValueRefreshRequest.method);
})(InlineValueRefreshRequest || (protocol_inlineValue.InlineValueRefreshRequest = InlineValueRefreshRequest = {}));

var protocol_inlayHint = {};

Object.defineProperty(protocol_inlayHint, '__esModule', {
  value: true
});

protocol_inlayHint.InlayHintRefreshRequest = protocol_inlayHint.InlayHintResolveRequest = protocol_inlayHint.InlayHintRequest = void 0;

const messages_1$3 = messages;

var InlayHintRequest;

(function(InlayHintRequest) {
  InlayHintRequest.method = 'textDocument/inlayHint';
  InlayHintRequest.messageDirection = messages_1$3.MessageDirection.clientToServer;
  InlayHintRequest.type = new messages_1$3.ProtocolRequestType(InlayHintRequest.method);
})(InlayHintRequest || (protocol_inlayHint.InlayHintRequest = InlayHintRequest = {}));

var InlayHintResolveRequest;

(function(InlayHintResolveRequest) {
  InlayHintResolveRequest.method = 'inlayHint/resolve';
  InlayHintResolveRequest.messageDirection = messages_1$3.MessageDirection.clientToServer;
  InlayHintResolveRequest.type = new messages_1$3.ProtocolRequestType(InlayHintResolveRequest.method);
})(InlayHintResolveRequest || (protocol_inlayHint.InlayHintResolveRequest = InlayHintResolveRequest = {}));

var InlayHintRefreshRequest;

(function(InlayHintRefreshRequest) {
  InlayHintRefreshRequest.method = `workspace/inlayHint/refresh`;
  InlayHintRefreshRequest.messageDirection = messages_1$3.MessageDirection.serverToClient;
  InlayHintRefreshRequest.type = new messages_1$3.ProtocolRequestType0(InlayHintRefreshRequest.method);
})(InlayHintRefreshRequest || (protocol_inlayHint.InlayHintRefreshRequest = InlayHintRefreshRequest = {}));

var protocol_diagnostic = {};

Object.defineProperty(protocol_diagnostic, '__esModule', {
  value: true
});

protocol_diagnostic.DiagnosticRefreshRequest = protocol_diagnostic.WorkspaceDiagnosticRequest = protocol_diagnostic.DocumentDiagnosticRequest = protocol_diagnostic.DocumentDiagnosticReportKind = protocol_diagnostic.DiagnosticServerCancellationData = void 0;

const vscode_jsonrpc_1$1 = main$1;

const Is$3 = is;

const messages_1$2 = messages;

var DiagnosticServerCancellationData;

(function(DiagnosticServerCancellationData) {
  function is(value) {
    const candidate = value;
    return candidate && Is$3.boolean(candidate.retriggerRequest);
  }
  DiagnosticServerCancellationData.is = is;
})(DiagnosticServerCancellationData || (protocol_diagnostic.DiagnosticServerCancellationData = DiagnosticServerCancellationData = {}));

var DocumentDiagnosticReportKind;

(function(DocumentDiagnosticReportKind) {
  DocumentDiagnosticReportKind.Full = 'full';
  DocumentDiagnosticReportKind.Unchanged = 'unchanged';
})(DocumentDiagnosticReportKind || (protocol_diagnostic.DocumentDiagnosticReportKind = DocumentDiagnosticReportKind = {}));

var DocumentDiagnosticRequest;

(function(DocumentDiagnosticRequest) {
  DocumentDiagnosticRequest.method = 'textDocument/diagnostic';
  DocumentDiagnosticRequest.messageDirection = messages_1$2.MessageDirection.clientToServer;
  DocumentDiagnosticRequest.type = new messages_1$2.ProtocolRequestType(DocumentDiagnosticRequest.method);
  DocumentDiagnosticRequest.partialResult = new vscode_jsonrpc_1$1.ProgressType;
})(DocumentDiagnosticRequest || (protocol_diagnostic.DocumentDiagnosticRequest = DocumentDiagnosticRequest = {}));

var WorkspaceDiagnosticRequest;

(function(WorkspaceDiagnosticRequest) {
  WorkspaceDiagnosticRequest.method = 'workspace/diagnostic';
  WorkspaceDiagnosticRequest.messageDirection = messages_1$2.MessageDirection.clientToServer;
  WorkspaceDiagnosticRequest.type = new messages_1$2.ProtocolRequestType(WorkspaceDiagnosticRequest.method);
  WorkspaceDiagnosticRequest.partialResult = new vscode_jsonrpc_1$1.ProgressType;
})(WorkspaceDiagnosticRequest || (protocol_diagnostic.WorkspaceDiagnosticRequest = WorkspaceDiagnosticRequest = {}));

var DiagnosticRefreshRequest;

(function(DiagnosticRefreshRequest) {
  DiagnosticRefreshRequest.method = `workspace/diagnostic/refresh`;
  DiagnosticRefreshRequest.messageDirection = messages_1$2.MessageDirection.serverToClient;
  DiagnosticRefreshRequest.type = new messages_1$2.ProtocolRequestType0(DiagnosticRefreshRequest.method);
})(DiagnosticRefreshRequest || (protocol_diagnostic.DiagnosticRefreshRequest = DiagnosticRefreshRequest = {}));

var protocol_notebook = {};

Object.defineProperty(protocol_notebook, '__esModule', {
  value: true
});

protocol_notebook.DidCloseNotebookDocumentNotification = protocol_notebook.DidSaveNotebookDocumentNotification = protocol_notebook.DidChangeNotebookDocumentNotification = protocol_notebook.NotebookCellArrayChange = protocol_notebook.DidOpenNotebookDocumentNotification = protocol_notebook.NotebookDocumentSyncRegistrationType = protocol_notebook.NotebookDocument = protocol_notebook.NotebookCell = protocol_notebook.ExecutionSummary = protocol_notebook.NotebookCellKind = void 0;

const vscode_languageserver_types_1 = mainExports;

const Is$2 = is;

const messages_1$1 = messages;

var NotebookCellKind;

(function(NotebookCellKind) {
  NotebookCellKind.Markup = 1;
  NotebookCellKind.Code = 2;
  function is(value) {
    return value === 1 || value === 2;
  }
  NotebookCellKind.is = is;
})(NotebookCellKind || (protocol_notebook.NotebookCellKind = NotebookCellKind = {}));

var ExecutionSummary;

(function(ExecutionSummary) {
  function create(executionOrder, success) {
    const result = {
      executionOrder: executionOrder
    };
    if (success === true || success === false) {
      result.success = success;
    }
    return result;
  }
  ExecutionSummary.create = create;
  function is(value) {
    const candidate = value;
    return Is$2.objectLiteral(candidate) && vscode_languageserver_types_1.uinteger.is(candidate.executionOrder) && (candidate.success === undefined || Is$2.boolean(candidate.success));
  }
  ExecutionSummary.is = is;
  function equals(one, other) {
    if (one === other) {
      return true;
    }
    if (one === null || one === undefined || other === null || other === undefined) {
      return false;
    }
    return one.executionOrder === other.executionOrder && one.success === other.success;
  }
  ExecutionSummary.equals = equals;
})(ExecutionSummary || (protocol_notebook.ExecutionSummary = ExecutionSummary = {}));

var NotebookCell;

(function(NotebookCell) {
  function create(kind, document) {
    return {
      kind: kind,
      document: document
    };
  }
  NotebookCell.create = create;
  function is(value) {
    const candidate = value;
    return Is$2.objectLiteral(candidate) && NotebookCellKind.is(candidate.kind) && vscode_languageserver_types_1.DocumentUri.is(candidate.document) && (candidate.metadata === undefined || Is$2.objectLiteral(candidate.metadata));
  }
  NotebookCell.is = is;
  function diff(one, two) {
    const result = new Set;
    if (one.document !== two.document) {
      result.add('document');
    }
    if (one.kind !== two.kind) {
      result.add('kind');
    }
    if (one.executionSummary !== two.executionSummary) {
      result.add('executionSummary');
    }
    if ((one.metadata !== undefined || two.metadata !== undefined) && !equalsMetadata(one.metadata, two.metadata)) {
      result.add('metadata');
    }
    if ((one.executionSummary !== undefined || two.executionSummary !== undefined) && !ExecutionSummary.equals(one.executionSummary, two.executionSummary)) {
      result.add('executionSummary');
    }
    return result;
  }
  NotebookCell.diff = diff;
  function equalsMetadata(one, other) {
    if (one === other) {
      return true;
    }
    if (one === null || one === undefined || other === null || other === undefined) {
      return false;
    }
    if (typeof one !== typeof other) {
      return false;
    }
    if (typeof one !== 'object') {
      return false;
    }
    const oneArray = Array.isArray(one);
    const otherArray = Array.isArray(other);
    if (oneArray !== otherArray) {
      return false;
    }
    if (oneArray && otherArray) {
      if (one.length !== other.length) {
        return false;
      }
      for (let i = 0; i < one.length; i++) {
        if (!equalsMetadata(one[i], other[i])) {
          return false;
        }
      }
    }
    if (Is$2.objectLiteral(one) && Is$2.objectLiteral(other)) {
      const oneKeys = Object.keys(one);
      const otherKeys = Object.keys(other);
      if (oneKeys.length !== otherKeys.length) {
        return false;
      }
      oneKeys.sort();
      otherKeys.sort();
      if (!equalsMetadata(oneKeys, otherKeys)) {
        return false;
      }
      for (let i = 0; i < oneKeys.length; i++) {
        const prop = oneKeys[i];
        if (!equalsMetadata(one[prop], other[prop])) {
          return false;
        }
      }
    }
    return true;
  }
})(NotebookCell || (protocol_notebook.NotebookCell = NotebookCell = {}));

var NotebookDocument;

(function(NotebookDocument) {
  function create(uri, notebookType, version, cells) {
    return {
      uri: uri,
      notebookType: notebookType,
      version: version,
      cells: cells
    };
  }
  NotebookDocument.create = create;
  function is(value) {
    const candidate = value;
    return Is$2.objectLiteral(candidate) && Is$2.string(candidate.uri) && vscode_languageserver_types_1.integer.is(candidate.version) && Is$2.typedArray(candidate.cells, NotebookCell.is);
  }
  NotebookDocument.is = is;
})(NotebookDocument || (protocol_notebook.NotebookDocument = NotebookDocument = {}));

var NotebookDocumentSyncRegistrationType;

(function(NotebookDocumentSyncRegistrationType) {
  NotebookDocumentSyncRegistrationType.method = 'notebookDocument/sync';
  NotebookDocumentSyncRegistrationType.messageDirection = messages_1$1.MessageDirection.clientToServer;
  NotebookDocumentSyncRegistrationType.type = new messages_1$1.RegistrationType(NotebookDocumentSyncRegistrationType.method);
})(NotebookDocumentSyncRegistrationType || (protocol_notebook.NotebookDocumentSyncRegistrationType = NotebookDocumentSyncRegistrationType = {}));

var DidOpenNotebookDocumentNotification;

(function(DidOpenNotebookDocumentNotification) {
  DidOpenNotebookDocumentNotification.method = 'notebookDocument/didOpen';
  DidOpenNotebookDocumentNotification.messageDirection = messages_1$1.MessageDirection.clientToServer;
  DidOpenNotebookDocumentNotification.type = new messages_1$1.ProtocolNotificationType(DidOpenNotebookDocumentNotification.method);
  DidOpenNotebookDocumentNotification.registrationMethod = NotebookDocumentSyncRegistrationType.method;
})(DidOpenNotebookDocumentNotification || (protocol_notebook.DidOpenNotebookDocumentNotification = DidOpenNotebookDocumentNotification = {}));

var NotebookCellArrayChange;

(function(NotebookCellArrayChange) {
  function is(value) {
    const candidate = value;
    return Is$2.objectLiteral(candidate) && vscode_languageserver_types_1.uinteger.is(candidate.start) && vscode_languageserver_types_1.uinteger.is(candidate.deleteCount) && (candidate.cells === undefined || Is$2.typedArray(candidate.cells, NotebookCell.is));
  }
  NotebookCellArrayChange.is = is;
  function create(start, deleteCount, cells) {
    const result = {
      start: start,
      deleteCount: deleteCount
    };
    if (cells !== undefined) {
      result.cells = cells;
    }
    return result;
  }
  NotebookCellArrayChange.create = create;
})(NotebookCellArrayChange || (protocol_notebook.NotebookCellArrayChange = NotebookCellArrayChange = {}));

var DidChangeNotebookDocumentNotification;

(function(DidChangeNotebookDocumentNotification) {
  DidChangeNotebookDocumentNotification.method = 'notebookDocument/didChange';
  DidChangeNotebookDocumentNotification.messageDirection = messages_1$1.MessageDirection.clientToServer;
  DidChangeNotebookDocumentNotification.type = new messages_1$1.ProtocolNotificationType(DidChangeNotebookDocumentNotification.method);
  DidChangeNotebookDocumentNotification.registrationMethod = NotebookDocumentSyncRegistrationType.method;
})(DidChangeNotebookDocumentNotification || (protocol_notebook.DidChangeNotebookDocumentNotification = DidChangeNotebookDocumentNotification = {}));

var DidSaveNotebookDocumentNotification;

(function(DidSaveNotebookDocumentNotification) {
  DidSaveNotebookDocumentNotification.method = 'notebookDocument/didSave';
  DidSaveNotebookDocumentNotification.messageDirection = messages_1$1.MessageDirection.clientToServer;
  DidSaveNotebookDocumentNotification.type = new messages_1$1.ProtocolNotificationType(DidSaveNotebookDocumentNotification.method);
  DidSaveNotebookDocumentNotification.registrationMethod = NotebookDocumentSyncRegistrationType.method;
})(DidSaveNotebookDocumentNotification || (protocol_notebook.DidSaveNotebookDocumentNotification = DidSaveNotebookDocumentNotification = {}));

var DidCloseNotebookDocumentNotification;

(function(DidCloseNotebookDocumentNotification) {
  DidCloseNotebookDocumentNotification.method = 'notebookDocument/didClose';
  DidCloseNotebookDocumentNotification.messageDirection = messages_1$1.MessageDirection.clientToServer;
  DidCloseNotebookDocumentNotification.type = new messages_1$1.ProtocolNotificationType(DidCloseNotebookDocumentNotification.method);
  DidCloseNotebookDocumentNotification.registrationMethod = NotebookDocumentSyncRegistrationType.method;
})(DidCloseNotebookDocumentNotification || (protocol_notebook.DidCloseNotebookDocumentNotification = DidCloseNotebookDocumentNotification = {}));

var protocol_inlineCompletion = {};

Object.defineProperty(protocol_inlineCompletion, '__esModule', {
  value: true
});

protocol_inlineCompletion.InlineCompletionRequest = void 0;

const messages_1 = messages;

var InlineCompletionRequest;

(function(InlineCompletionRequest) {
  InlineCompletionRequest.method = 'textDocument/inlineCompletion';
  InlineCompletionRequest.messageDirection = messages_1.MessageDirection.clientToServer;
  InlineCompletionRequest.type = new messages_1.ProtocolRequestType(InlineCompletionRequest.method);
})(InlineCompletionRequest || (protocol_inlineCompletion.InlineCompletionRequest = InlineCompletionRequest = {}));

(function(exports) {
  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  exports.WorkspaceSymbolRequest = exports.CodeActionResolveRequest = exports.CodeActionRequest = exports.DocumentSymbolRequest = exports.DocumentHighlightRequest = exports.ReferencesRequest = exports.DefinitionRequest = exports.SignatureHelpRequest = exports.SignatureHelpTriggerKind = exports.HoverRequest = exports.CompletionResolveRequest = exports.CompletionRequest = exports.CompletionTriggerKind = exports.PublishDiagnosticsNotification = exports.WatchKind = exports.RelativePattern = exports.FileChangeType = exports.DidChangeWatchedFilesNotification = exports.WillSaveTextDocumentWaitUntilRequest = exports.WillSaveTextDocumentNotification = exports.TextDocumentSaveReason = exports.DidSaveTextDocumentNotification = exports.DidCloseTextDocumentNotification = exports.DidChangeTextDocumentNotification = exports.TextDocumentContentChangeEvent = exports.DidOpenTextDocumentNotification = exports.TextDocumentSyncKind = exports.TelemetryEventNotification = exports.LogMessageNotification = exports.ShowMessageRequest = exports.ShowMessageNotification = exports.MessageType = exports.DidChangeConfigurationNotification = exports.ExitNotification = exports.ShutdownRequest = exports.InitializedNotification = exports.InitializeErrorCodes = exports.InitializeRequest = exports.WorkDoneProgressOptions = exports.TextDocumentRegistrationOptions = exports.StaticRegistrationOptions = exports.PositionEncodingKind = exports.FailureHandlingKind = exports.ResourceOperationKind = exports.UnregistrationRequest = exports.RegistrationRequest = exports.DocumentSelector = exports.NotebookCellTextDocumentFilter = exports.NotebookDocumentFilter = exports.TextDocumentFilter = void 0;
  exports.MonikerRequest = exports.MonikerKind = exports.UniquenessLevel = exports.WillDeleteFilesRequest = exports.DidDeleteFilesNotification = exports.WillRenameFilesRequest = exports.DidRenameFilesNotification = exports.WillCreateFilesRequest = exports.DidCreateFilesNotification = exports.FileOperationPatternKind = exports.LinkedEditingRangeRequest = exports.ShowDocumentRequest = exports.SemanticTokensRegistrationType = exports.SemanticTokensRefreshRequest = exports.SemanticTokensRangeRequest = exports.SemanticTokensDeltaRequest = exports.SemanticTokensRequest = exports.TokenFormat = exports.CallHierarchyPrepareRequest = exports.CallHierarchyOutgoingCallsRequest = exports.CallHierarchyIncomingCallsRequest = exports.WorkDoneProgressCancelNotification = exports.WorkDoneProgressCreateRequest = exports.WorkDoneProgress = exports.SelectionRangeRequest = exports.DeclarationRequest = exports.FoldingRangeRefreshRequest = exports.FoldingRangeRequest = exports.ColorPresentationRequest = exports.DocumentColorRequest = exports.ConfigurationRequest = exports.DidChangeWorkspaceFoldersNotification = exports.WorkspaceFoldersRequest = exports.TypeDefinitionRequest = exports.ImplementationRequest = exports.ApplyWorkspaceEditRequest = exports.ExecuteCommandRequest = exports.PrepareRenameRequest = exports.RenameRequest = exports.PrepareSupportDefaultBehavior = exports.DocumentOnTypeFormattingRequest = exports.DocumentRangesFormattingRequest = exports.DocumentRangeFormattingRequest = exports.DocumentFormattingRequest = exports.DocumentLinkResolveRequest = exports.DocumentLinkRequest = exports.CodeLensRefreshRequest = exports.CodeLensResolveRequest = exports.CodeLensRequest = exports.WorkspaceSymbolResolveRequest = void 0;
  exports.InlineCompletionRequest = exports.DidCloseNotebookDocumentNotification = exports.DidSaveNotebookDocumentNotification = exports.DidChangeNotebookDocumentNotification = exports.NotebookCellArrayChange = exports.DidOpenNotebookDocumentNotification = exports.NotebookDocumentSyncRegistrationType = exports.NotebookDocument = exports.NotebookCell = exports.ExecutionSummary = exports.NotebookCellKind = exports.DiagnosticRefreshRequest = exports.WorkspaceDiagnosticRequest = exports.DocumentDiagnosticRequest = exports.DocumentDiagnosticReportKind = exports.DiagnosticServerCancellationData = exports.InlayHintRefreshRequest = exports.InlayHintResolveRequest = exports.InlayHintRequest = exports.InlineValueRefreshRequest = exports.InlineValueRequest = exports.TypeHierarchySupertypesRequest = exports.TypeHierarchySubtypesRequest = exports.TypeHierarchyPrepareRequest = void 0;
  const messages_1 = messages;
  const vscode_languageserver_types_1 = mainExports;
  const Is = is;
  const protocol_implementation_1 = protocol_implementation;
  Object.defineProperty(exports, 'ImplementationRequest', {
    enumerable: true,
    get: function() {
      return protocol_implementation_1.ImplementationRequest;
    }
  });
  const protocol_typeDefinition_1 = protocol_typeDefinition;
  Object.defineProperty(exports, 'TypeDefinitionRequest', {
    enumerable: true,
    get: function() {
      return protocol_typeDefinition_1.TypeDefinitionRequest;
    }
  });
  const protocol_workspaceFolder_1 = protocol_workspaceFolder;
  Object.defineProperty(exports, 'WorkspaceFoldersRequest', {
    enumerable: true,
    get: function() {
      return protocol_workspaceFolder_1.WorkspaceFoldersRequest;
    }
  });
  Object.defineProperty(exports, 'DidChangeWorkspaceFoldersNotification', {
    enumerable: true,
    get: function() {
      return protocol_workspaceFolder_1.DidChangeWorkspaceFoldersNotification;
    }
  });
  const protocol_configuration_1 = protocol_configuration;
  Object.defineProperty(exports, 'ConfigurationRequest', {
    enumerable: true,
    get: function() {
      return protocol_configuration_1.ConfigurationRequest;
    }
  });
  const protocol_colorProvider_1 = protocol_colorProvider;
  Object.defineProperty(exports, 'DocumentColorRequest', {
    enumerable: true,
    get: function() {
      return protocol_colorProvider_1.DocumentColorRequest;
    }
  });
  Object.defineProperty(exports, 'ColorPresentationRequest', {
    enumerable: true,
    get: function() {
      return protocol_colorProvider_1.ColorPresentationRequest;
    }
  });
  const protocol_foldingRange_1 = protocol_foldingRange;
  Object.defineProperty(exports, 'FoldingRangeRequest', {
    enumerable: true,
    get: function() {
      return protocol_foldingRange_1.FoldingRangeRequest;
    }
  });
  Object.defineProperty(exports, 'FoldingRangeRefreshRequest', {
    enumerable: true,
    get: function() {
      return protocol_foldingRange_1.FoldingRangeRefreshRequest;
    }
  });
  const protocol_declaration_1 = protocol_declaration;
  Object.defineProperty(exports, 'DeclarationRequest', {
    enumerable: true,
    get: function() {
      return protocol_declaration_1.DeclarationRequest;
    }
  });
  const protocol_selectionRange_1 = protocol_selectionRange;
  Object.defineProperty(exports, 'SelectionRangeRequest', {
    enumerable: true,
    get: function() {
      return protocol_selectionRange_1.SelectionRangeRequest;
    }
  });
  const protocol_progress_1 = protocol_progress;
  Object.defineProperty(exports, 'WorkDoneProgress', {
    enumerable: true,
    get: function() {
      return protocol_progress_1.WorkDoneProgress;
    }
  });
  Object.defineProperty(exports, 'WorkDoneProgressCreateRequest', {
    enumerable: true,
    get: function() {
      return protocol_progress_1.WorkDoneProgressCreateRequest;
    }
  });
  Object.defineProperty(exports, 'WorkDoneProgressCancelNotification', {
    enumerable: true,
    get: function() {
      return protocol_progress_1.WorkDoneProgressCancelNotification;
    }
  });
  const protocol_callHierarchy_1 = protocol_callHierarchy;
  Object.defineProperty(exports, 'CallHierarchyIncomingCallsRequest', {
    enumerable: true,
    get: function() {
      return protocol_callHierarchy_1.CallHierarchyIncomingCallsRequest;
    }
  });
  Object.defineProperty(exports, 'CallHierarchyOutgoingCallsRequest', {
    enumerable: true,
    get: function() {
      return protocol_callHierarchy_1.CallHierarchyOutgoingCallsRequest;
    }
  });
  Object.defineProperty(exports, 'CallHierarchyPrepareRequest', {
    enumerable: true,
    get: function() {
      return protocol_callHierarchy_1.CallHierarchyPrepareRequest;
    }
  });
  const protocol_semanticTokens_1 = protocol_semanticTokens;
  Object.defineProperty(exports, 'TokenFormat', {
    enumerable: true,
    get: function() {
      return protocol_semanticTokens_1.TokenFormat;
    }
  });
  Object.defineProperty(exports, 'SemanticTokensRequest', {
    enumerable: true,
    get: function() {
      return protocol_semanticTokens_1.SemanticTokensRequest;
    }
  });
  Object.defineProperty(exports, 'SemanticTokensDeltaRequest', {
    enumerable: true,
    get: function() {
      return protocol_semanticTokens_1.SemanticTokensDeltaRequest;
    }
  });
  Object.defineProperty(exports, 'SemanticTokensRangeRequest', {
    enumerable: true,
    get: function() {
      return protocol_semanticTokens_1.SemanticTokensRangeRequest;
    }
  });
  Object.defineProperty(exports, 'SemanticTokensRefreshRequest', {
    enumerable: true,
    get: function() {
      return protocol_semanticTokens_1.SemanticTokensRefreshRequest;
    }
  });
  Object.defineProperty(exports, 'SemanticTokensRegistrationType', {
    enumerable: true,
    get: function() {
      return protocol_semanticTokens_1.SemanticTokensRegistrationType;
    }
  });
  const protocol_showDocument_1 = protocol_showDocument;
  Object.defineProperty(exports, 'ShowDocumentRequest', {
    enumerable: true,
    get: function() {
      return protocol_showDocument_1.ShowDocumentRequest;
    }
  });
  const protocol_linkedEditingRange_1 = protocol_linkedEditingRange;
  Object.defineProperty(exports, 'LinkedEditingRangeRequest', {
    enumerable: true,
    get: function() {
      return protocol_linkedEditingRange_1.LinkedEditingRangeRequest;
    }
  });
  const protocol_fileOperations_1 = protocol_fileOperations;
  Object.defineProperty(exports, 'FileOperationPatternKind', {
    enumerable: true,
    get: function() {
      return protocol_fileOperations_1.FileOperationPatternKind;
    }
  });
  Object.defineProperty(exports, 'DidCreateFilesNotification', {
    enumerable: true,
    get: function() {
      return protocol_fileOperations_1.DidCreateFilesNotification;
    }
  });
  Object.defineProperty(exports, 'WillCreateFilesRequest', {
    enumerable: true,
    get: function() {
      return protocol_fileOperations_1.WillCreateFilesRequest;
    }
  });
  Object.defineProperty(exports, 'DidRenameFilesNotification', {
    enumerable: true,
    get: function() {
      return protocol_fileOperations_1.DidRenameFilesNotification;
    }
  });
  Object.defineProperty(exports, 'WillRenameFilesRequest', {
    enumerable: true,
    get: function() {
      return protocol_fileOperations_1.WillRenameFilesRequest;
    }
  });
  Object.defineProperty(exports, 'DidDeleteFilesNotification', {
    enumerable: true,
    get: function() {
      return protocol_fileOperations_1.DidDeleteFilesNotification;
    }
  });
  Object.defineProperty(exports, 'WillDeleteFilesRequest', {
    enumerable: true,
    get: function() {
      return protocol_fileOperations_1.WillDeleteFilesRequest;
    }
  });
  const protocol_moniker_1 = protocol_moniker;
  Object.defineProperty(exports, 'UniquenessLevel', {
    enumerable: true,
    get: function() {
      return protocol_moniker_1.UniquenessLevel;
    }
  });
  Object.defineProperty(exports, 'MonikerKind', {
    enumerable: true,
    get: function() {
      return protocol_moniker_1.MonikerKind;
    }
  });
  Object.defineProperty(exports, 'MonikerRequest', {
    enumerable: true,
    get: function() {
      return protocol_moniker_1.MonikerRequest;
    }
  });
  const protocol_typeHierarchy_1 = protocol_typeHierarchy;
  Object.defineProperty(exports, 'TypeHierarchyPrepareRequest', {
    enumerable: true,
    get: function() {
      return protocol_typeHierarchy_1.TypeHierarchyPrepareRequest;
    }
  });
  Object.defineProperty(exports, 'TypeHierarchySubtypesRequest', {
    enumerable: true,
    get: function() {
      return protocol_typeHierarchy_1.TypeHierarchySubtypesRequest;
    }
  });
  Object.defineProperty(exports, 'TypeHierarchySupertypesRequest', {
    enumerable: true,
    get: function() {
      return protocol_typeHierarchy_1.TypeHierarchySupertypesRequest;
    }
  });
  const protocol_inlineValue_1 = protocol_inlineValue;
  Object.defineProperty(exports, 'InlineValueRequest', {
    enumerable: true,
    get: function() {
      return protocol_inlineValue_1.InlineValueRequest;
    }
  });
  Object.defineProperty(exports, 'InlineValueRefreshRequest', {
    enumerable: true,
    get: function() {
      return protocol_inlineValue_1.InlineValueRefreshRequest;
    }
  });
  const protocol_inlayHint_1 = protocol_inlayHint;
  Object.defineProperty(exports, 'InlayHintRequest', {
    enumerable: true,
    get: function() {
      return protocol_inlayHint_1.InlayHintRequest;
    }
  });
  Object.defineProperty(exports, 'InlayHintResolveRequest', {
    enumerable: true,
    get: function() {
      return protocol_inlayHint_1.InlayHintResolveRequest;
    }
  });
  Object.defineProperty(exports, 'InlayHintRefreshRequest', {
    enumerable: true,
    get: function() {
      return protocol_inlayHint_1.InlayHintRefreshRequest;
    }
  });
  const protocol_diagnostic_1 = protocol_diagnostic;
  Object.defineProperty(exports, 'DiagnosticServerCancellationData', {
    enumerable: true,
    get: function() {
      return protocol_diagnostic_1.DiagnosticServerCancellationData;
    }
  });
  Object.defineProperty(exports, 'DocumentDiagnosticReportKind', {
    enumerable: true,
    get: function() {
      return protocol_diagnostic_1.DocumentDiagnosticReportKind;
    }
  });
  Object.defineProperty(exports, 'DocumentDiagnosticRequest', {
    enumerable: true,
    get: function() {
      return protocol_diagnostic_1.DocumentDiagnosticRequest;
    }
  });
  Object.defineProperty(exports, 'WorkspaceDiagnosticRequest', {
    enumerable: true,
    get: function() {
      return protocol_diagnostic_1.WorkspaceDiagnosticRequest;
    }
  });
  Object.defineProperty(exports, 'DiagnosticRefreshRequest', {
    enumerable: true,
    get: function() {
      return protocol_diagnostic_1.DiagnosticRefreshRequest;
    }
  });
  const protocol_notebook_1 = protocol_notebook;
  Object.defineProperty(exports, 'NotebookCellKind', {
    enumerable: true,
    get: function() {
      return protocol_notebook_1.NotebookCellKind;
    }
  });
  Object.defineProperty(exports, 'ExecutionSummary', {
    enumerable: true,
    get: function() {
      return protocol_notebook_1.ExecutionSummary;
    }
  });
  Object.defineProperty(exports, 'NotebookCell', {
    enumerable: true,
    get: function() {
      return protocol_notebook_1.NotebookCell;
    }
  });
  Object.defineProperty(exports, 'NotebookDocument', {
    enumerable: true,
    get: function() {
      return protocol_notebook_1.NotebookDocument;
    }
  });
  Object.defineProperty(exports, 'NotebookDocumentSyncRegistrationType', {
    enumerable: true,
    get: function() {
      return protocol_notebook_1.NotebookDocumentSyncRegistrationType;
    }
  });
  Object.defineProperty(exports, 'DidOpenNotebookDocumentNotification', {
    enumerable: true,
    get: function() {
      return protocol_notebook_1.DidOpenNotebookDocumentNotification;
    }
  });
  Object.defineProperty(exports, 'NotebookCellArrayChange', {
    enumerable: true,
    get: function() {
      return protocol_notebook_1.NotebookCellArrayChange;
    }
  });
  Object.defineProperty(exports, 'DidChangeNotebookDocumentNotification', {
    enumerable: true,
    get: function() {
      return protocol_notebook_1.DidChangeNotebookDocumentNotification;
    }
  });
  Object.defineProperty(exports, 'DidSaveNotebookDocumentNotification', {
    enumerable: true,
    get: function() {
      return protocol_notebook_1.DidSaveNotebookDocumentNotification;
    }
  });
  Object.defineProperty(exports, 'DidCloseNotebookDocumentNotification', {
    enumerable: true,
    get: function() {
      return protocol_notebook_1.DidCloseNotebookDocumentNotification;
    }
  });
  const protocol_inlineCompletion_1 = protocol_inlineCompletion;
  Object.defineProperty(exports, 'InlineCompletionRequest', {
    enumerable: true,
    get: function() {
      return protocol_inlineCompletion_1.InlineCompletionRequest;
    }
  });
  var TextDocumentFilter;
  (function(TextDocumentFilter) {
    function is(value) {
      const candidate = value;
      return Is.string(candidate) || (Is.string(candidate.language) || Is.string(candidate.scheme) || Is.string(candidate.pattern));
    }
    TextDocumentFilter.is = is;
  })(TextDocumentFilter || (exports.TextDocumentFilter = TextDocumentFilter = {}));
  var NotebookDocumentFilter;
  (function(NotebookDocumentFilter) {
    function is(value) {
      const candidate = value;
      return Is.objectLiteral(candidate) && (Is.string(candidate.notebookType) || Is.string(candidate.scheme) || Is.string(candidate.pattern));
    }
    NotebookDocumentFilter.is = is;
  })(NotebookDocumentFilter || (exports.NotebookDocumentFilter = NotebookDocumentFilter = {}));
  var NotebookCellTextDocumentFilter;
  (function(NotebookCellTextDocumentFilter) {
    function is(value) {
      const candidate = value;
      return Is.objectLiteral(candidate) && (Is.string(candidate.notebook) || NotebookDocumentFilter.is(candidate.notebook)) && (candidate.language === undefined || Is.string(candidate.language));
    }
    NotebookCellTextDocumentFilter.is = is;
  })(NotebookCellTextDocumentFilter || (exports.NotebookCellTextDocumentFilter = NotebookCellTextDocumentFilter = {}));
  var DocumentSelector;
  (function(DocumentSelector) {
    function is(value) {
      if (!Array.isArray(value)) {
        return false;
      }
      for (let elem of value) {
        if (!Is.string(elem) && !TextDocumentFilter.is(elem) && !NotebookCellTextDocumentFilter.is(elem)) {
          return false;
        }
      }
      return true;
    }
    DocumentSelector.is = is;
  })(DocumentSelector || (exports.DocumentSelector = DocumentSelector = {}));
  var RegistrationRequest;
  (function(RegistrationRequest) {
    RegistrationRequest.method = 'client/registerCapability';
    RegistrationRequest.messageDirection = messages_1.MessageDirection.serverToClient;
    RegistrationRequest.type = new messages_1.ProtocolRequestType(RegistrationRequest.method);
  })(RegistrationRequest || (exports.RegistrationRequest = RegistrationRequest = {}));
  var UnregistrationRequest;
  (function(UnregistrationRequest) {
    UnregistrationRequest.method = 'client/unregisterCapability';
    UnregistrationRequest.messageDirection = messages_1.MessageDirection.serverToClient;
    UnregistrationRequest.type = new messages_1.ProtocolRequestType(UnregistrationRequest.method);
  })(UnregistrationRequest || (exports.UnregistrationRequest = UnregistrationRequest = {}));
  var ResourceOperationKind;
  (function(ResourceOperationKind) {
    ResourceOperationKind.Create = 'create';
    ResourceOperationKind.Rename = 'rename';
    ResourceOperationKind.Delete = 'delete';
  })(ResourceOperationKind || (exports.ResourceOperationKind = ResourceOperationKind = {}));
  var FailureHandlingKind;
  (function(FailureHandlingKind) {
    FailureHandlingKind.Abort = 'abort';
    FailureHandlingKind.Transactional = 'transactional';
    FailureHandlingKind.TextOnlyTransactional = 'textOnlyTransactional';
    FailureHandlingKind.Undo = 'undo';
  })(FailureHandlingKind || (exports.FailureHandlingKind = FailureHandlingKind = {}));
  var PositionEncodingKind;
  (function(PositionEncodingKind) {
    PositionEncodingKind.UTF8 = 'utf-8';
    PositionEncodingKind.UTF16 = 'utf-16';
    PositionEncodingKind.UTF32 = 'utf-32';
  })(PositionEncodingKind || (exports.PositionEncodingKind = PositionEncodingKind = {}));
  var StaticRegistrationOptions;
  (function(StaticRegistrationOptions) {
    function hasId(value) {
      const candidate = value;
      return candidate && Is.string(candidate.id) && candidate.id.length > 0;
    }
    StaticRegistrationOptions.hasId = hasId;
  })(StaticRegistrationOptions || (exports.StaticRegistrationOptions = StaticRegistrationOptions = {}));
  var TextDocumentRegistrationOptions;
  (function(TextDocumentRegistrationOptions) {
    function is(value) {
      const candidate = value;
      return candidate && (candidate.documentSelector === null || DocumentSelector.is(candidate.documentSelector));
    }
    TextDocumentRegistrationOptions.is = is;
  })(TextDocumentRegistrationOptions || (exports.TextDocumentRegistrationOptions = TextDocumentRegistrationOptions = {}));
  var WorkDoneProgressOptions;
  (function(WorkDoneProgressOptions) {
    function is(value) {
      const candidate = value;
      return Is.objectLiteral(candidate) && (candidate.workDoneProgress === undefined || Is.boolean(candidate.workDoneProgress));
    }
    WorkDoneProgressOptions.is = is;
    function hasWorkDoneProgress(value) {
      const candidate = value;
      return candidate && Is.boolean(candidate.workDoneProgress);
    }
    WorkDoneProgressOptions.hasWorkDoneProgress = hasWorkDoneProgress;
  })(WorkDoneProgressOptions || (exports.WorkDoneProgressOptions = WorkDoneProgressOptions = {}));
  var InitializeRequest;
  (function(InitializeRequest) {
    InitializeRequest.method = 'initialize';
    InitializeRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    InitializeRequest.type = new messages_1.ProtocolRequestType(InitializeRequest.method);
  })(InitializeRequest || (exports.InitializeRequest = InitializeRequest = {}));
  var InitializeErrorCodes;
  (function(InitializeErrorCodes) {
    InitializeErrorCodes.unknownProtocolVersion = 1;
  })(InitializeErrorCodes || (exports.InitializeErrorCodes = InitializeErrorCodes = {}));
  var InitializedNotification;
  (function(InitializedNotification) {
    InitializedNotification.method = 'initialized';
    InitializedNotification.messageDirection = messages_1.MessageDirection.clientToServer;
    InitializedNotification.type = new messages_1.ProtocolNotificationType(InitializedNotification.method);
  })(InitializedNotification || (exports.InitializedNotification = InitializedNotification = {}));
  var ShutdownRequest;
  (function(ShutdownRequest) {
    ShutdownRequest.method = 'shutdown';
    ShutdownRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    ShutdownRequest.type = new messages_1.ProtocolRequestType0(ShutdownRequest.method);
  })(ShutdownRequest || (exports.ShutdownRequest = ShutdownRequest = {}));
  var ExitNotification;
  (function(ExitNotification) {
    ExitNotification.method = 'exit';
    ExitNotification.messageDirection = messages_1.MessageDirection.clientToServer;
    ExitNotification.type = new messages_1.ProtocolNotificationType0(ExitNotification.method);
  })(ExitNotification || (exports.ExitNotification = ExitNotification = {}));
  var DidChangeConfigurationNotification;
  (function(DidChangeConfigurationNotification) {
    DidChangeConfigurationNotification.method = 'workspace/didChangeConfiguration';
    DidChangeConfigurationNotification.messageDirection = messages_1.MessageDirection.clientToServer;
    DidChangeConfigurationNotification.type = new messages_1.ProtocolNotificationType(DidChangeConfigurationNotification.method);
  })(DidChangeConfigurationNotification || (exports.DidChangeConfigurationNotification = DidChangeConfigurationNotification = {}));
  var MessageType;
  (function(MessageType) {
    MessageType.Error = 1;
    MessageType.Warning = 2;
    MessageType.Info = 3;
    MessageType.Log = 4;
    MessageType.Debug = 5;
  })(MessageType || (exports.MessageType = MessageType = {}));
  var ShowMessageNotification;
  (function(ShowMessageNotification) {
    ShowMessageNotification.method = 'window/showMessage';
    ShowMessageNotification.messageDirection = messages_1.MessageDirection.serverToClient;
    ShowMessageNotification.type = new messages_1.ProtocolNotificationType(ShowMessageNotification.method);
  })(ShowMessageNotification || (exports.ShowMessageNotification = ShowMessageNotification = {}));
  var ShowMessageRequest;
  (function(ShowMessageRequest) {
    ShowMessageRequest.method = 'window/showMessageRequest';
    ShowMessageRequest.messageDirection = messages_1.MessageDirection.serverToClient;
    ShowMessageRequest.type = new messages_1.ProtocolRequestType(ShowMessageRequest.method);
  })(ShowMessageRequest || (exports.ShowMessageRequest = ShowMessageRequest = {}));
  var LogMessageNotification;
  (function(LogMessageNotification) {
    LogMessageNotification.method = 'window/logMessage';
    LogMessageNotification.messageDirection = messages_1.MessageDirection.serverToClient;
    LogMessageNotification.type = new messages_1.ProtocolNotificationType(LogMessageNotification.method);
  })(LogMessageNotification || (exports.LogMessageNotification = LogMessageNotification = {}));
  var TelemetryEventNotification;
  (function(TelemetryEventNotification) {
    TelemetryEventNotification.method = 'telemetry/event';
    TelemetryEventNotification.messageDirection = messages_1.MessageDirection.serverToClient;
    TelemetryEventNotification.type = new messages_1.ProtocolNotificationType(TelemetryEventNotification.method);
  })(TelemetryEventNotification || (exports.TelemetryEventNotification = TelemetryEventNotification = {}));
  var TextDocumentSyncKind;
  (function(TextDocumentSyncKind) {
    TextDocumentSyncKind.None = 0;
    TextDocumentSyncKind.Full = 1;
    TextDocumentSyncKind.Incremental = 2;
  })(TextDocumentSyncKind || (exports.TextDocumentSyncKind = TextDocumentSyncKind = {}));
  var DidOpenTextDocumentNotification;
  (function(DidOpenTextDocumentNotification) {
    DidOpenTextDocumentNotification.method = 'textDocument/didOpen';
    DidOpenTextDocumentNotification.messageDirection = messages_1.MessageDirection.clientToServer;
    DidOpenTextDocumentNotification.type = new messages_1.ProtocolNotificationType(DidOpenTextDocumentNotification.method);
  })(DidOpenTextDocumentNotification || (exports.DidOpenTextDocumentNotification = DidOpenTextDocumentNotification = {}));
  var TextDocumentContentChangeEvent;
  (function(TextDocumentContentChangeEvent) {
    function isIncremental(event) {
      let candidate = event;
      return candidate !== undefined && candidate !== null && typeof candidate.text === 'string' && candidate.range !== undefined && (candidate.rangeLength === undefined || typeof candidate.rangeLength === 'number');
    }
    TextDocumentContentChangeEvent.isIncremental = isIncremental;
    function isFull(event) {
      let candidate = event;
      return candidate !== undefined && candidate !== null && typeof candidate.text === 'string' && candidate.range === undefined && candidate.rangeLength === undefined;
    }
    TextDocumentContentChangeEvent.isFull = isFull;
  })(TextDocumentContentChangeEvent || (exports.TextDocumentContentChangeEvent = TextDocumentContentChangeEvent = {}));
  var DidChangeTextDocumentNotification;
  (function(DidChangeTextDocumentNotification) {
    DidChangeTextDocumentNotification.method = 'textDocument/didChange';
    DidChangeTextDocumentNotification.messageDirection = messages_1.MessageDirection.clientToServer;
    DidChangeTextDocumentNotification.type = new messages_1.ProtocolNotificationType(DidChangeTextDocumentNotification.method);
  })(DidChangeTextDocumentNotification || (exports.DidChangeTextDocumentNotification = DidChangeTextDocumentNotification = {}));
  var DidCloseTextDocumentNotification;
  (function(DidCloseTextDocumentNotification) {
    DidCloseTextDocumentNotification.method = 'textDocument/didClose';
    DidCloseTextDocumentNotification.messageDirection = messages_1.MessageDirection.clientToServer;
    DidCloseTextDocumentNotification.type = new messages_1.ProtocolNotificationType(DidCloseTextDocumentNotification.method);
  })(DidCloseTextDocumentNotification || (exports.DidCloseTextDocumentNotification = DidCloseTextDocumentNotification = {}));
  var DidSaveTextDocumentNotification;
  (function(DidSaveTextDocumentNotification) {
    DidSaveTextDocumentNotification.method = 'textDocument/didSave';
    DidSaveTextDocumentNotification.messageDirection = messages_1.MessageDirection.clientToServer;
    DidSaveTextDocumentNotification.type = new messages_1.ProtocolNotificationType(DidSaveTextDocumentNotification.method);
  })(DidSaveTextDocumentNotification || (exports.DidSaveTextDocumentNotification = DidSaveTextDocumentNotification = {}));
  var TextDocumentSaveReason;
  (function(TextDocumentSaveReason) {
    TextDocumentSaveReason.Manual = 1;
    TextDocumentSaveReason.AfterDelay = 2;
    TextDocumentSaveReason.FocusOut = 3;
  })(TextDocumentSaveReason || (exports.TextDocumentSaveReason = TextDocumentSaveReason = {}));
  var WillSaveTextDocumentNotification;
  (function(WillSaveTextDocumentNotification) {
    WillSaveTextDocumentNotification.method = 'textDocument/willSave';
    WillSaveTextDocumentNotification.messageDirection = messages_1.MessageDirection.clientToServer;
    WillSaveTextDocumentNotification.type = new messages_1.ProtocolNotificationType(WillSaveTextDocumentNotification.method);
  })(WillSaveTextDocumentNotification || (exports.WillSaveTextDocumentNotification = WillSaveTextDocumentNotification = {}));
  var WillSaveTextDocumentWaitUntilRequest;
  (function(WillSaveTextDocumentWaitUntilRequest) {
    WillSaveTextDocumentWaitUntilRequest.method = 'textDocument/willSaveWaitUntil';
    WillSaveTextDocumentWaitUntilRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    WillSaveTextDocumentWaitUntilRequest.type = new messages_1.ProtocolRequestType(WillSaveTextDocumentWaitUntilRequest.method);
  })(WillSaveTextDocumentWaitUntilRequest || (exports.WillSaveTextDocumentWaitUntilRequest = WillSaveTextDocumentWaitUntilRequest = {}));
  var DidChangeWatchedFilesNotification;
  (function(DidChangeWatchedFilesNotification) {
    DidChangeWatchedFilesNotification.method = 'workspace/didChangeWatchedFiles';
    DidChangeWatchedFilesNotification.messageDirection = messages_1.MessageDirection.clientToServer;
    DidChangeWatchedFilesNotification.type = new messages_1.ProtocolNotificationType(DidChangeWatchedFilesNotification.method);
  })(DidChangeWatchedFilesNotification || (exports.DidChangeWatchedFilesNotification = DidChangeWatchedFilesNotification = {}));
  var FileChangeType;
  (function(FileChangeType) {
    FileChangeType.Created = 1;
    FileChangeType.Changed = 2;
    FileChangeType.Deleted = 3;
  })(FileChangeType || (exports.FileChangeType = FileChangeType = {}));
  var RelativePattern;
  (function(RelativePattern) {
    function is(value) {
      const candidate = value;
      return Is.objectLiteral(candidate) && (vscode_languageserver_types_1.URI.is(candidate.baseUri) || vscode_languageserver_types_1.WorkspaceFolder.is(candidate.baseUri)) && Is.string(candidate.pattern);
    }
    RelativePattern.is = is;
  })(RelativePattern || (exports.RelativePattern = RelativePattern = {}));
  var WatchKind;
  (function(WatchKind) {
    WatchKind.Create = 1;
    WatchKind.Change = 2;
    WatchKind.Delete = 4;
  })(WatchKind || (exports.WatchKind = WatchKind = {}));
  var PublishDiagnosticsNotification;
  (function(PublishDiagnosticsNotification) {
    PublishDiagnosticsNotification.method = 'textDocument/publishDiagnostics';
    PublishDiagnosticsNotification.messageDirection = messages_1.MessageDirection.serverToClient;
    PublishDiagnosticsNotification.type = new messages_1.ProtocolNotificationType(PublishDiagnosticsNotification.method);
  })(PublishDiagnosticsNotification || (exports.PublishDiagnosticsNotification = PublishDiagnosticsNotification = {}));
  var CompletionTriggerKind;
  (function(CompletionTriggerKind) {
    CompletionTriggerKind.Invoked = 1;
    CompletionTriggerKind.TriggerCharacter = 2;
    CompletionTriggerKind.TriggerForIncompleteCompletions = 3;
  })(CompletionTriggerKind || (exports.CompletionTriggerKind = CompletionTriggerKind = {}));
  var CompletionRequest;
  (function(CompletionRequest) {
    CompletionRequest.method = 'textDocument/completion';
    CompletionRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    CompletionRequest.type = new messages_1.ProtocolRequestType(CompletionRequest.method);
  })(CompletionRequest || (exports.CompletionRequest = CompletionRequest = {}));
  var CompletionResolveRequest;
  (function(CompletionResolveRequest) {
    CompletionResolveRequest.method = 'completionItem/resolve';
    CompletionResolveRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    CompletionResolveRequest.type = new messages_1.ProtocolRequestType(CompletionResolveRequest.method);
  })(CompletionResolveRequest || (exports.CompletionResolveRequest = CompletionResolveRequest = {}));
  var HoverRequest;
  (function(HoverRequest) {
    HoverRequest.method = 'textDocument/hover';
    HoverRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    HoverRequest.type = new messages_1.ProtocolRequestType(HoverRequest.method);
  })(HoverRequest || (exports.HoverRequest = HoverRequest = {}));
  var SignatureHelpTriggerKind;
  (function(SignatureHelpTriggerKind) {
    SignatureHelpTriggerKind.Invoked = 1;
    SignatureHelpTriggerKind.TriggerCharacter = 2;
    SignatureHelpTriggerKind.ContentChange = 3;
  })(SignatureHelpTriggerKind || (exports.SignatureHelpTriggerKind = SignatureHelpTriggerKind = {}));
  var SignatureHelpRequest;
  (function(SignatureHelpRequest) {
    SignatureHelpRequest.method = 'textDocument/signatureHelp';
    SignatureHelpRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    SignatureHelpRequest.type = new messages_1.ProtocolRequestType(SignatureHelpRequest.method);
  })(SignatureHelpRequest || (exports.SignatureHelpRequest = SignatureHelpRequest = {}));
  var DefinitionRequest;
  (function(DefinitionRequest) {
    DefinitionRequest.method = 'textDocument/definition';
    DefinitionRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    DefinitionRequest.type = new messages_1.ProtocolRequestType(DefinitionRequest.method);
  })(DefinitionRequest || (exports.DefinitionRequest = DefinitionRequest = {}));
  var ReferencesRequest;
  (function(ReferencesRequest) {
    ReferencesRequest.method = 'textDocument/references';
    ReferencesRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    ReferencesRequest.type = new messages_1.ProtocolRequestType(ReferencesRequest.method);
  })(ReferencesRequest || (exports.ReferencesRequest = ReferencesRequest = {}));
  var DocumentHighlightRequest;
  (function(DocumentHighlightRequest) {
    DocumentHighlightRequest.method = 'textDocument/documentHighlight';
    DocumentHighlightRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    DocumentHighlightRequest.type = new messages_1.ProtocolRequestType(DocumentHighlightRequest.method);
  })(DocumentHighlightRequest || (exports.DocumentHighlightRequest = DocumentHighlightRequest = {}));
  var DocumentSymbolRequest;
  (function(DocumentSymbolRequest) {
    DocumentSymbolRequest.method = 'textDocument/documentSymbol';
    DocumentSymbolRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    DocumentSymbolRequest.type = new messages_1.ProtocolRequestType(DocumentSymbolRequest.method);
  })(DocumentSymbolRequest || (exports.DocumentSymbolRequest = DocumentSymbolRequest = {}));
  var CodeActionRequest;
  (function(CodeActionRequest) {
    CodeActionRequest.method = 'textDocument/codeAction';
    CodeActionRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    CodeActionRequest.type = new messages_1.ProtocolRequestType(CodeActionRequest.method);
  })(CodeActionRequest || (exports.CodeActionRequest = CodeActionRequest = {}));
  var CodeActionResolveRequest;
  (function(CodeActionResolveRequest) {
    CodeActionResolveRequest.method = 'codeAction/resolve';
    CodeActionResolveRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    CodeActionResolveRequest.type = new messages_1.ProtocolRequestType(CodeActionResolveRequest.method);
  })(CodeActionResolveRequest || (exports.CodeActionResolveRequest = CodeActionResolveRequest = {}));
  var WorkspaceSymbolRequest;
  (function(WorkspaceSymbolRequest) {
    WorkspaceSymbolRequest.method = 'workspace/symbol';
    WorkspaceSymbolRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    WorkspaceSymbolRequest.type = new messages_1.ProtocolRequestType(WorkspaceSymbolRequest.method);
  })(WorkspaceSymbolRequest || (exports.WorkspaceSymbolRequest = WorkspaceSymbolRequest = {}));
  var WorkspaceSymbolResolveRequest;
  (function(WorkspaceSymbolResolveRequest) {
    WorkspaceSymbolResolveRequest.method = 'workspaceSymbol/resolve';
    WorkspaceSymbolResolveRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    WorkspaceSymbolResolveRequest.type = new messages_1.ProtocolRequestType(WorkspaceSymbolResolveRequest.method);
  })(WorkspaceSymbolResolveRequest || (exports.WorkspaceSymbolResolveRequest = WorkspaceSymbolResolveRequest = {}));
  var CodeLensRequest;
  (function(CodeLensRequest) {
    CodeLensRequest.method = 'textDocument/codeLens';
    CodeLensRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    CodeLensRequest.type = new messages_1.ProtocolRequestType(CodeLensRequest.method);
  })(CodeLensRequest || (exports.CodeLensRequest = CodeLensRequest = {}));
  var CodeLensResolveRequest;
  (function(CodeLensResolveRequest) {
    CodeLensResolveRequest.method = 'codeLens/resolve';
    CodeLensResolveRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    CodeLensResolveRequest.type = new messages_1.ProtocolRequestType(CodeLensResolveRequest.method);
  })(CodeLensResolveRequest || (exports.CodeLensResolveRequest = CodeLensResolveRequest = {}));
  var CodeLensRefreshRequest;
  (function(CodeLensRefreshRequest) {
    CodeLensRefreshRequest.method = `workspace/codeLens/refresh`;
    CodeLensRefreshRequest.messageDirection = messages_1.MessageDirection.serverToClient;
    CodeLensRefreshRequest.type = new messages_1.ProtocolRequestType0(CodeLensRefreshRequest.method);
  })(CodeLensRefreshRequest || (exports.CodeLensRefreshRequest = CodeLensRefreshRequest = {}));
  var DocumentLinkRequest;
  (function(DocumentLinkRequest) {
    DocumentLinkRequest.method = 'textDocument/documentLink';
    DocumentLinkRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    DocumentLinkRequest.type = new messages_1.ProtocolRequestType(DocumentLinkRequest.method);
  })(DocumentLinkRequest || (exports.DocumentLinkRequest = DocumentLinkRequest = {}));
  var DocumentLinkResolveRequest;
  (function(DocumentLinkResolveRequest) {
    DocumentLinkResolveRequest.method = 'documentLink/resolve';
    DocumentLinkResolveRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    DocumentLinkResolveRequest.type = new messages_1.ProtocolRequestType(DocumentLinkResolveRequest.method);
  })(DocumentLinkResolveRequest || (exports.DocumentLinkResolveRequest = DocumentLinkResolveRequest = {}));
  var DocumentFormattingRequest;
  (function(DocumentFormattingRequest) {
    DocumentFormattingRequest.method = 'textDocument/formatting';
    DocumentFormattingRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    DocumentFormattingRequest.type = new messages_1.ProtocolRequestType(DocumentFormattingRequest.method);
  })(DocumentFormattingRequest || (exports.DocumentFormattingRequest = DocumentFormattingRequest = {}));
  var DocumentRangeFormattingRequest;
  (function(DocumentRangeFormattingRequest) {
    DocumentRangeFormattingRequest.method = 'textDocument/rangeFormatting';
    DocumentRangeFormattingRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    DocumentRangeFormattingRequest.type = new messages_1.ProtocolRequestType(DocumentRangeFormattingRequest.method);
  })(DocumentRangeFormattingRequest || (exports.DocumentRangeFormattingRequest = DocumentRangeFormattingRequest = {}));
  var DocumentRangesFormattingRequest;
  (function(DocumentRangesFormattingRequest) {
    DocumentRangesFormattingRequest.method = 'textDocument/rangesFormatting';
    DocumentRangesFormattingRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    DocumentRangesFormattingRequest.type = new messages_1.ProtocolRequestType(DocumentRangesFormattingRequest.method);
  })(DocumentRangesFormattingRequest || (exports.DocumentRangesFormattingRequest = DocumentRangesFormattingRequest = {}));
  var DocumentOnTypeFormattingRequest;
  (function(DocumentOnTypeFormattingRequest) {
    DocumentOnTypeFormattingRequest.method = 'textDocument/onTypeFormatting';
    DocumentOnTypeFormattingRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    DocumentOnTypeFormattingRequest.type = new messages_1.ProtocolRequestType(DocumentOnTypeFormattingRequest.method);
  })(DocumentOnTypeFormattingRequest || (exports.DocumentOnTypeFormattingRequest = DocumentOnTypeFormattingRequest = {}));
  var PrepareSupportDefaultBehavior;
  (function(PrepareSupportDefaultBehavior) {
    PrepareSupportDefaultBehavior.Identifier = 1;
  })(PrepareSupportDefaultBehavior || (exports.PrepareSupportDefaultBehavior = PrepareSupportDefaultBehavior = {}));
  var RenameRequest;
  (function(RenameRequest) {
    RenameRequest.method = 'textDocument/rename';
    RenameRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    RenameRequest.type = new messages_1.ProtocolRequestType(RenameRequest.method);
  })(RenameRequest || (exports.RenameRequest = RenameRequest = {}));
  var PrepareRenameRequest;
  (function(PrepareRenameRequest) {
    PrepareRenameRequest.method = 'textDocument/prepareRename';
    PrepareRenameRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    PrepareRenameRequest.type = new messages_1.ProtocolRequestType(PrepareRenameRequest.method);
  })(PrepareRenameRequest || (exports.PrepareRenameRequest = PrepareRenameRequest = {}));
  var ExecuteCommandRequest;
  (function(ExecuteCommandRequest) {
    ExecuteCommandRequest.method = 'workspace/executeCommand';
    ExecuteCommandRequest.messageDirection = messages_1.MessageDirection.clientToServer;
    ExecuteCommandRequest.type = new messages_1.ProtocolRequestType(ExecuteCommandRequest.method);
  })(ExecuteCommandRequest || (exports.ExecuteCommandRequest = ExecuteCommandRequest = {}));
  var ApplyWorkspaceEditRequest;
  (function(ApplyWorkspaceEditRequest) {
    ApplyWorkspaceEditRequest.method = 'workspace/applyEdit';
    ApplyWorkspaceEditRequest.messageDirection = messages_1.MessageDirection.serverToClient;
    ApplyWorkspaceEditRequest.type = new messages_1.ProtocolRequestType('workspace/applyEdit');
  })(ApplyWorkspaceEditRequest || (exports.ApplyWorkspaceEditRequest = ApplyWorkspaceEditRequest = {}));
})(protocol);

var connection = {};

Object.defineProperty(connection, '__esModule', {
  value: true
});

connection.createProtocolConnection = void 0;

const vscode_jsonrpc_1 = main$1;

function createProtocolConnection(input, output, logger, options) {
  if (vscode_jsonrpc_1.ConnectionStrategy.is(options)) {
    options = {
      connectionStrategy: options
    };
  }
  return (0, vscode_jsonrpc_1.createMessageConnection)(input, output, logger, options);
}

connection.createProtocolConnection = createProtocolConnection;

(function(exports) {
  var __createBinding = commonjsGlobal && commonjsGlobal.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = {
        enumerable: true,
        get: function() {
          return m[k];
        }
      };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
  });
  var __exportStar = commonjsGlobal && commonjsGlobal.__exportStar || function(m, exports) {
    for (var p in m) if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
  };
  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  exports.LSPErrorCodes = exports.createProtocolConnection = void 0;
  __exportStar(main$1, exports);
  __exportStar(mainExports, exports);
  __exportStar(messages, exports);
  __exportStar(protocol, exports);
  var connection_1 = connection;
  Object.defineProperty(exports, 'createProtocolConnection', {
    enumerable: true,
    get: function() {
      return connection_1.createProtocolConnection;
    }
  });
  var LSPErrorCodes;
  (function(LSPErrorCodes) {
    LSPErrorCodes.lspReservedErrorRangeStart = -32899;
    LSPErrorCodes.RequestFailed = -32803;
    LSPErrorCodes.ServerCancelled = -32802;
    LSPErrorCodes.ContentModified = -32801;
    LSPErrorCodes.RequestCancelled = -32800;
    LSPErrorCodes.lspReservedErrorRangeEnd = -32800;
  })(LSPErrorCodes || (exports.LSPErrorCodes = LSPErrorCodes = {}));
})(api$1);

(function(exports) {
  var __createBinding = commonjsGlobal && commonjsGlobal.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = {
        enumerable: true,
        get: function() {
          return m[k];
        }
      };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
  });
  var __exportStar = commonjsGlobal && commonjsGlobal.__exportStar || function(m, exports) {
    for (var p in m) if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
  };
  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  exports.createProtocolConnection = void 0;
  const node_1 = node$2;
  __exportStar(node$2, exports);
  __exportStar(api$1, exports);
  function createProtocolConnection(input, output, logger, options) {
    return (0, node_1.createMessageConnection)(input, output, logger, options);
  }
  exports.createProtocolConnection = createProtocolConnection;
})(main$2);

var uuid = {};

Object.defineProperty(uuid, '__esModule', {
  value: true
});

uuid.generateUuid = uuid.parse = uuid.isUUID = uuid.v4 = uuid.empty = void 0;

class ValueUUID {
  constructor(_value) {
    this._value = _value;
  }
  asHex() {
    return this._value;
  }
  equals(other) {
    return this.asHex() === other.asHex();
  }
}

class V4UUID extends ValueUUID {
  static _oneOf(array) {
    return array[Math.floor(array.length * Math.random())];
  }
  static _randomHex() {
    return V4UUID._oneOf(V4UUID._chars);
  }
  constructor() {
    super([ V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), '-', V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), '-', '4', V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), '-', V4UUID._oneOf(V4UUID._timeHighBits), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), '-', V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex(), V4UUID._randomHex() ].join(''));
  }
}

V4UUID._chars = [ '0', '1', '2', '3', '4', '5', '6', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f' ];

V4UUID._timeHighBits = [ '8', '9', 'a', 'b' ];

uuid.empty = new ValueUUID('00000000-0000-0000-0000-000000000000');

function v4() {
  return new V4UUID;
}

uuid.v4 = v4;

const _UUIDPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(value) {
  return _UUIDPattern.test(value);
}

uuid.isUUID = isUUID;

function parse$7(value) {
  if (!isUUID(value)) {
    throw new Error('invalid uuid');
  }
  return new ValueUUID(value);
}

uuid.parse = parse$7;

function generateUuid() {
  return v4().asHex();
}

uuid.generateUuid = generateUuid;

var progress = {};

Object.defineProperty(progress, '__esModule', {
  value: true
});

progress.attachPartialResult = progress.ProgressFeature = attachWorkDone_1 = progress.attachWorkDone = void 0;

const vscode_languageserver_protocol_1$h = main$2;

const uuid_1 = uuid;

class WorkDoneProgressReporterImpl {
  constructor(_connection, _token) {
    this._connection = _connection;
    this._token = _token;
    WorkDoneProgressReporterImpl.Instances.set(this._token, this);
  }
  begin(title, percentage, message, cancellable) {
    let param = {
      kind: 'begin',
      title: title,
      percentage: percentage,
      message: message,
      cancellable: cancellable
    };
    this._connection.sendProgress(vscode_languageserver_protocol_1$h.WorkDoneProgress.type, this._token, param);
  }
  report(arg0, arg1) {
    let param = {
      kind: 'report'
    };
    if (typeof arg0 === 'number') {
      param.percentage = arg0;
      if (arg1 !== undefined) {
        param.message = arg1;
      }
    } else {
      param.message = arg0;
    }
    this._connection.sendProgress(vscode_languageserver_protocol_1$h.WorkDoneProgress.type, this._token, param);
  }
  done() {
    WorkDoneProgressReporterImpl.Instances.delete(this._token);
    this._connection.sendProgress(vscode_languageserver_protocol_1$h.WorkDoneProgress.type, this._token, {
      kind: 'end'
    });
  }
}

WorkDoneProgressReporterImpl.Instances = new Map;

class WorkDoneProgressServerReporterImpl extends WorkDoneProgressReporterImpl {
  constructor(connection, token) {
    super(connection, token);
    this._source = new vscode_languageserver_protocol_1$h.CancellationTokenSource;
  }
  get token() {
    return this._source.token;
  }
  done() {
    this._source.dispose();
    super.done();
  }
  cancel() {
    this._source.cancel();
  }
}

class NullProgressReporter {
  constructor() {}
  begin() {}
  report() {}
  done() {}
}

class NullProgressServerReporter extends NullProgressReporter {
  constructor() {
    super();
    this._source = new vscode_languageserver_protocol_1$h.CancellationTokenSource;
  }
  get token() {
    return this._source.token;
  }
  done() {
    this._source.dispose();
  }
  cancel() {
    this._source.cancel();
  }
}

function attachWorkDone(connection, params) {
  if (params === undefined || params.workDoneToken === undefined) {
    return new NullProgressReporter;
  }
  const token = params.workDoneToken;
  delete params.workDoneToken;
  return new WorkDoneProgressReporterImpl(connection, token);
}

var attachWorkDone_1 = progress.attachWorkDone = attachWorkDone;

const ProgressFeature = Base => class extends Base {
  constructor() {
    super();
    this._progressSupported = false;
  }
  initialize(capabilities) {
    super.initialize(capabilities);
    if (capabilities?.window?.workDoneProgress === true) {
      this._progressSupported = true;
      this.connection.onNotification(vscode_languageserver_protocol_1$h.WorkDoneProgressCancelNotification.type, (params => {
        let progress = WorkDoneProgressReporterImpl.Instances.get(params.token);
        if (progress instanceof WorkDoneProgressServerReporterImpl || progress instanceof NullProgressServerReporter) {
          progress.cancel();
        }
      }));
    }
  }
  attachWorkDoneProgress(token) {
    if (token === undefined) {
      return new NullProgressReporter;
    } else {
      return new WorkDoneProgressReporterImpl(this.connection, token);
    }
  }
  createWorkDoneProgress() {
    if (this._progressSupported) {
      const token = (0, uuid_1.generateUuid)();
      return this.connection.sendRequest(vscode_languageserver_protocol_1$h.WorkDoneProgressCreateRequest.type, {
        token: token
      }).then((() => {
        const result = new WorkDoneProgressServerReporterImpl(this.connection, token);
        return result;
      }));
    } else {
      return Promise.resolve(new NullProgressServerReporter);
    }
  }
};

progress.ProgressFeature = ProgressFeature;

var ResultProgress;

(function(ResultProgress) {
  ResultProgress.type = new vscode_languageserver_protocol_1$h.ProgressType;
})(ResultProgress || (ResultProgress = {}));

class ResultProgressReporterImpl {
  constructor(_connection, _token) {
    this._connection = _connection;
    this._token = _token;
  }
  report(data) {
    this._connection.sendProgress(ResultProgress.type, this._token, data);
  }
}

function attachPartialResult(connection, params) {
  if (params === undefined || params.partialResultToken === undefined) {
    return undefined;
  }
  const token = params.partialResultToken;
  delete params.partialResultToken;
  return new ResultProgressReporterImpl(connection, token);
}

progress.attachPartialResult = attachPartialResult;

var configuration = {};

Object.defineProperty(configuration, '__esModule', {
  value: true
});

configuration.ConfigurationFeature = void 0;

const vscode_languageserver_protocol_1$g = main$2;

const Is$1 = is$2;

const ConfigurationFeature = Base => class extends Base {
  getConfiguration(arg) {
    if (!arg) {
      return this._getConfiguration({});
    } else if (Is$1.string(arg)) {
      return this._getConfiguration({
        section: arg
      });
    } else {
      return this._getConfiguration(arg);
    }
  }
  _getConfiguration(arg) {
    let params = {
      items: Array.isArray(arg) ? arg : [ arg ]
    };
    return this.connection.sendRequest(vscode_languageserver_protocol_1$g.ConfigurationRequest.type, params).then((result => {
      if (Array.isArray(result)) {
        return Array.isArray(arg) ? result : result[0];
      } else {
        return Array.isArray(arg) ? [] : null;
      }
    }));
  }
};

configuration.ConfigurationFeature = ConfigurationFeature;

var workspaceFolder = {};

Object.defineProperty(workspaceFolder, '__esModule', {
  value: true
});

workspaceFolder.WorkspaceFoldersFeature = void 0;

const vscode_languageserver_protocol_1$f = main$2;

const WorkspaceFoldersFeature = Base => class extends Base {
  constructor() {
    super();
    this._notificationIsAutoRegistered = false;
  }
  initialize(capabilities) {
    super.initialize(capabilities);
    let workspaceCapabilities = capabilities.workspace;
    if (workspaceCapabilities && workspaceCapabilities.workspaceFolders) {
      this._onDidChangeWorkspaceFolders = new vscode_languageserver_protocol_1$f.Emitter;
      this.connection.onNotification(vscode_languageserver_protocol_1$f.DidChangeWorkspaceFoldersNotification.type, (params => {
        this._onDidChangeWorkspaceFolders.fire(params.event);
      }));
    }
  }
  fillServerCapabilities(capabilities) {
    super.fillServerCapabilities(capabilities);
    const changeNotifications = capabilities.workspace?.workspaceFolders?.changeNotifications;
    this._notificationIsAutoRegistered = changeNotifications === true || typeof changeNotifications === 'string';
  }
  getWorkspaceFolders() {
    return this.connection.sendRequest(vscode_languageserver_protocol_1$f.WorkspaceFoldersRequest.type);
  }
  get onDidChangeWorkspaceFolders() {
    if (!this._onDidChangeWorkspaceFolders) {
      throw new Error('Client doesn\'t support sending workspace folder change events.');
    }
    if (!this._notificationIsAutoRegistered && !this._unregistration) {
      this._unregistration = this.connection.client.register(vscode_languageserver_protocol_1$f.DidChangeWorkspaceFoldersNotification.type);
    }
    return this._onDidChangeWorkspaceFolders.event;
  }
};

workspaceFolder.WorkspaceFoldersFeature = WorkspaceFoldersFeature;

var callHierarchy = {};

Object.defineProperty(callHierarchy, '__esModule', {
  value: true
});

callHierarchy.CallHierarchyFeature = void 0;

const vscode_languageserver_protocol_1$e = main$2;

const CallHierarchyFeature = Base => class extends Base {
  get callHierarchy() {
    return {
      onPrepare: handler => this.connection.onRequest(vscode_languageserver_protocol_1$e.CallHierarchyPrepareRequest.type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params), undefined))),
      onIncomingCalls: handler => {
        const type = vscode_languageserver_protocol_1$e.CallHierarchyIncomingCallsRequest.type;
        return this.connection.onRequest(type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params))));
      },
      onOutgoingCalls: handler => {
        const type = vscode_languageserver_protocol_1$e.CallHierarchyOutgoingCallsRequest.type;
        return this.connection.onRequest(type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params))));
      }
    };
  }
};

callHierarchy.CallHierarchyFeature = CallHierarchyFeature;

var semanticTokens = {};

Object.defineProperty(semanticTokens, '__esModule', {
  value: true
});

semanticTokens.SemanticTokensBuilder = semanticTokens.SemanticTokensDiff = semanticTokens.SemanticTokensFeature = void 0;

const vscode_languageserver_protocol_1$d = main$2;

const SemanticTokensFeature = Base => class extends Base {
  get semanticTokens() {
    return {
      refresh: () => this.connection.sendRequest(vscode_languageserver_protocol_1$d.SemanticTokensRefreshRequest.type),
      on: handler => {
        const type = vscode_languageserver_protocol_1$d.SemanticTokensRequest.type;
        return this.connection.onRequest(type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params))));
      },
      onDelta: handler => {
        const type = vscode_languageserver_protocol_1$d.SemanticTokensDeltaRequest.type;
        return this.connection.onRequest(type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params))));
      },
      onRange: handler => {
        const type = vscode_languageserver_protocol_1$d.SemanticTokensRangeRequest.type;
        return this.connection.onRequest(type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params))));
      }
    };
  }
};

semanticTokens.SemanticTokensFeature = SemanticTokensFeature;

class SemanticTokensDiff {
  constructor(originalSequence, modifiedSequence) {
    this.originalSequence = originalSequence;
    this.modifiedSequence = modifiedSequence;
  }
  computeDiff() {
    const originalLength = this.originalSequence.length;
    const modifiedLength = this.modifiedSequence.length;
    let startIndex = 0;
    while (startIndex < modifiedLength && startIndex < originalLength && this.originalSequence[startIndex] === this.modifiedSequence[startIndex]) {
      startIndex++;
    }
    if (startIndex < modifiedLength && startIndex < originalLength) {
      let originalEndIndex = originalLength - 1;
      let modifiedEndIndex = modifiedLength - 1;
      while (originalEndIndex >= startIndex && modifiedEndIndex >= startIndex && this.originalSequence[originalEndIndex] === this.modifiedSequence[modifiedEndIndex]) {
        originalEndIndex--;
        modifiedEndIndex--;
      }
      if (originalEndIndex < startIndex || modifiedEndIndex < startIndex) {
        originalEndIndex++;
        modifiedEndIndex++;
      }
      const deleteCount = originalEndIndex - startIndex + 1;
      const newData = this.modifiedSequence.slice(startIndex, modifiedEndIndex + 1);
      if (newData.length === 1 && newData[0] === this.originalSequence[originalEndIndex]) {
        return [ {
          start: startIndex,
          deleteCount: deleteCount - 1
        } ];
      } else {
        return [ {
          start: startIndex,
          deleteCount: deleteCount,
          data: newData
        } ];
      }
    } else if (startIndex < modifiedLength) {
      return [ {
        start: startIndex,
        deleteCount: 0,
        data: this.modifiedSequence.slice(startIndex)
      } ];
    } else if (startIndex < originalLength) {
      return [ {
        start: startIndex,
        deleteCount: originalLength - startIndex
      } ];
    } else {
      return [];
    }
  }
}

semanticTokens.SemanticTokensDiff = SemanticTokensDiff;

class SemanticTokensBuilder {
  constructor() {
    this._prevData = undefined;
    this.initialize();
  }
  initialize() {
    this._id = Date.now();
    this._prevLine = 0;
    this._prevChar = 0;
    this._data = [];
    this._dataLen = 0;
  }
  push(line, char, length, tokenType, tokenModifiers) {
    let pushLine = line;
    let pushChar = char;
    if (this._dataLen > 0) {
      pushLine -= this._prevLine;
      if (pushLine === 0) {
        pushChar -= this._prevChar;
      }
    }
    this._data[this._dataLen++] = pushLine;
    this._data[this._dataLen++] = pushChar;
    this._data[this._dataLen++] = length;
    this._data[this._dataLen++] = tokenType;
    this._data[this._dataLen++] = tokenModifiers;
    this._prevLine = line;
    this._prevChar = char;
  }
  get id() {
    return this._id.toString();
  }
  previousResult(id) {
    if (this.id === id) {
      this._prevData = this._data;
    }
    this.initialize();
  }
  build() {
    this._prevData = undefined;
    return {
      resultId: this.id,
      data: this._data
    };
  }
  canBuildEdits() {
    return this._prevData !== undefined;
  }
  buildEdits() {
    if (this._prevData !== undefined) {
      return {
        resultId: this.id,
        edits: new SemanticTokensDiff(this._prevData, this._data).computeDiff()
      };
    } else {
      return this.build();
    }
  }
}

semanticTokens.SemanticTokensBuilder = SemanticTokensBuilder;

var showDocument = {};

Object.defineProperty(showDocument, '__esModule', {
  value: true
});

showDocument.ShowDocumentFeature = void 0;

const vscode_languageserver_protocol_1$c = main$2;

const ShowDocumentFeature = Base => class extends Base {
  showDocument(params) {
    return this.connection.sendRequest(vscode_languageserver_protocol_1$c.ShowDocumentRequest.type, params);
  }
};

showDocument.ShowDocumentFeature = ShowDocumentFeature;

var fileOperations = {};

Object.defineProperty(fileOperations, '__esModule', {
  value: true
});

fileOperations.FileOperationsFeature = void 0;

const vscode_languageserver_protocol_1$b = main$2;

const FileOperationsFeature = Base => class extends Base {
  onDidCreateFiles(handler) {
    return this.connection.onNotification(vscode_languageserver_protocol_1$b.DidCreateFilesNotification.type, (params => {
      handler(params);
    }));
  }
  onDidRenameFiles(handler) {
    return this.connection.onNotification(vscode_languageserver_protocol_1$b.DidRenameFilesNotification.type, (params => {
      handler(params);
    }));
  }
  onDidDeleteFiles(handler) {
    return this.connection.onNotification(vscode_languageserver_protocol_1$b.DidDeleteFilesNotification.type, (params => {
      handler(params);
    }));
  }
  onWillCreateFiles(handler) {
    return this.connection.onRequest(vscode_languageserver_protocol_1$b.WillCreateFilesRequest.type, ((params, cancel) => handler(params, cancel)));
  }
  onWillRenameFiles(handler) {
    return this.connection.onRequest(vscode_languageserver_protocol_1$b.WillRenameFilesRequest.type, ((params, cancel) => handler(params, cancel)));
  }
  onWillDeleteFiles(handler) {
    return this.connection.onRequest(vscode_languageserver_protocol_1$b.WillDeleteFilesRequest.type, ((params, cancel) => handler(params, cancel)));
  }
};

fileOperations.FileOperationsFeature = FileOperationsFeature;

var linkedEditingRange = {};

Object.defineProperty(linkedEditingRange, '__esModule', {
  value: true
});

linkedEditingRange.LinkedEditingRangeFeature = void 0;

const vscode_languageserver_protocol_1$a = main$2;

const LinkedEditingRangeFeature = Base => class extends Base {
  onLinkedEditingRange(handler) {
    return this.connection.onRequest(vscode_languageserver_protocol_1$a.LinkedEditingRangeRequest.type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params), undefined)));
  }
};

linkedEditingRange.LinkedEditingRangeFeature = LinkedEditingRangeFeature;

var typeHierarchy = {};

Object.defineProperty(typeHierarchy, '__esModule', {
  value: true
});

typeHierarchy.TypeHierarchyFeature = void 0;

const vscode_languageserver_protocol_1$9 = main$2;

const TypeHierarchyFeature = Base => class extends Base {
  get typeHierarchy() {
    return {
      onPrepare: handler => this.connection.onRequest(vscode_languageserver_protocol_1$9.TypeHierarchyPrepareRequest.type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params), undefined))),
      onSupertypes: handler => {
        const type = vscode_languageserver_protocol_1$9.TypeHierarchySupertypesRequest.type;
        return this.connection.onRequest(type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params))));
      },
      onSubtypes: handler => {
        const type = vscode_languageserver_protocol_1$9.TypeHierarchySubtypesRequest.type;
        return this.connection.onRequest(type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params))));
      }
    };
  }
};

typeHierarchy.TypeHierarchyFeature = TypeHierarchyFeature;

var inlineValue = {};

Object.defineProperty(inlineValue, '__esModule', {
  value: true
});

inlineValue.InlineValueFeature = void 0;

const vscode_languageserver_protocol_1$8 = main$2;

const InlineValueFeature = Base => class extends Base {
  get inlineValue() {
    return {
      refresh: () => this.connection.sendRequest(vscode_languageserver_protocol_1$8.InlineValueRefreshRequest.type),
      on: handler => this.connection.onRequest(vscode_languageserver_protocol_1$8.InlineValueRequest.type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params))))
    };
  }
};

inlineValue.InlineValueFeature = InlineValueFeature;

var foldingRange = {};

Object.defineProperty(foldingRange, '__esModule', {
  value: true
});

foldingRange.FoldingRangeFeature = void 0;

const vscode_languageserver_protocol_1$7 = main$2;

const FoldingRangeFeature = Base => class extends Base {
  get foldingRange() {
    return {
      refresh: () => this.connection.sendRequest(vscode_languageserver_protocol_1$7.FoldingRangeRefreshRequest.type),
      on: handler => {
        const type = vscode_languageserver_protocol_1$7.FoldingRangeRequest.type;
        return this.connection.onRequest(type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params))));
      }
    };
  }
};

foldingRange.FoldingRangeFeature = FoldingRangeFeature;

var inlayHint = {};

Object.defineProperty(inlayHint, '__esModule', {
  value: true
});

inlayHint.InlayHintFeature = void 0;

const vscode_languageserver_protocol_1$6 = main$2;

const InlayHintFeature = Base => class extends Base {
  get inlayHint() {
    return {
      refresh: () => this.connection.sendRequest(vscode_languageserver_protocol_1$6.InlayHintRefreshRequest.type),
      on: handler => this.connection.onRequest(vscode_languageserver_protocol_1$6.InlayHintRequest.type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params)))),
      resolve: handler => this.connection.onRequest(vscode_languageserver_protocol_1$6.InlayHintResolveRequest.type, ((params, cancel) => handler(params, cancel)))
    };
  }
};

inlayHint.InlayHintFeature = InlayHintFeature;

var diagnostic = {};

Object.defineProperty(diagnostic, '__esModule', {
  value: true
});

diagnostic.DiagnosticFeature = void 0;

const vscode_languageserver_protocol_1$5 = main$2;

const DiagnosticFeature = Base => class extends Base {
  get diagnostics() {
    return {
      refresh: () => this.connection.sendRequest(vscode_languageserver_protocol_1$5.DiagnosticRefreshRequest.type),
      on: handler => this.connection.onRequest(vscode_languageserver_protocol_1$5.DocumentDiagnosticRequest.type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(vscode_languageserver_protocol_1$5.DocumentDiagnosticRequest.partialResult, params)))),
      onWorkspace: handler => this.connection.onRequest(vscode_languageserver_protocol_1$5.WorkspaceDiagnosticRequest.type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(vscode_languageserver_protocol_1$5.WorkspaceDiagnosticRequest.partialResult, params))))
    };
  }
};

diagnostic.DiagnosticFeature = DiagnosticFeature;

var notebook = {};

var textDocuments = {};

Object.defineProperty(textDocuments, '__esModule', {
  value: true
});

textDocuments.TextDocuments = void 0;

const vscode_languageserver_protocol_1$4 = main$2;

class TextDocuments {
  constructor(configuration) {
    this._configuration = configuration;
    this._syncedDocuments = new Map;
    this._onDidChangeContent = new vscode_languageserver_protocol_1$4.Emitter;
    this._onDidOpen = new vscode_languageserver_protocol_1$4.Emitter;
    this._onDidClose = new vscode_languageserver_protocol_1$4.Emitter;
    this._onDidSave = new vscode_languageserver_protocol_1$4.Emitter;
    this._onWillSave = new vscode_languageserver_protocol_1$4.Emitter;
  }
  get onDidOpen() {
    return this._onDidOpen.event;
  }
  get onDidChangeContent() {
    return this._onDidChangeContent.event;
  }
  get onWillSave() {
    return this._onWillSave.event;
  }
  onWillSaveWaitUntil(handler) {
    this._willSaveWaitUntil = handler;
  }
  get onDidSave() {
    return this._onDidSave.event;
  }
  get onDidClose() {
    return this._onDidClose.event;
  }
  get(uri) {
    return this._syncedDocuments.get(uri);
  }
  all() {
    return Array.from(this._syncedDocuments.values());
  }
  keys() {
    return Array.from(this._syncedDocuments.keys());
  }
  listen(connection) {
    connection.__textDocumentSync = vscode_languageserver_protocol_1$4.TextDocumentSyncKind.Incremental;
    const disposables = [];
    disposables.push(connection.onDidOpenTextDocument((event => {
      const td = event.textDocument;
      const document = this._configuration.create(td.uri, td.languageId, td.version, td.text);
      this._syncedDocuments.set(td.uri, document);
      const toFire = Object.freeze({
        document: document
      });
      this._onDidOpen.fire(toFire);
      this._onDidChangeContent.fire(toFire);
    })));
    disposables.push(connection.onDidChangeTextDocument((event => {
      const td = event.textDocument;
      const changes = event.contentChanges;
      if (changes.length === 0) {
        return;
      }
      const {version: version} = td;
      if (version === null || version === undefined) {
        throw new Error(`Received document change event for ${td.uri} without valid version identifier`);
      }
      let syncedDocument = this._syncedDocuments.get(td.uri);
      if (syncedDocument !== undefined) {
        syncedDocument = this._configuration.update(syncedDocument, changes, version);
        this._syncedDocuments.set(td.uri, syncedDocument);
        this._onDidChangeContent.fire(Object.freeze({
          document: syncedDocument
        }));
      }
    })));
    disposables.push(connection.onDidCloseTextDocument((event => {
      let syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
      if (syncedDocument !== undefined) {
        this._syncedDocuments.delete(event.textDocument.uri);
        this._onDidClose.fire(Object.freeze({
          document: syncedDocument
        }));
      }
    })));
    disposables.push(connection.onWillSaveTextDocument((event => {
      let syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
      if (syncedDocument !== undefined) {
        this._onWillSave.fire(Object.freeze({
          document: syncedDocument,
          reason: event.reason
        }));
      }
    })));
    disposables.push(connection.onWillSaveTextDocumentWaitUntil(((event, token) => {
      let syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
      if (syncedDocument !== undefined && this._willSaveWaitUntil) {
        return this._willSaveWaitUntil(Object.freeze({
          document: syncedDocument,
          reason: event.reason
        }), token);
      } else {
        return [];
      }
    })));
    disposables.push(connection.onDidSaveTextDocument((event => {
      let syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
      if (syncedDocument !== undefined) {
        this._onDidSave.fire(Object.freeze({
          document: syncedDocument
        }));
      }
    })));
    return vscode_languageserver_protocol_1$4.Disposable.create((() => {
      disposables.forEach((disposable => disposable.dispose()));
    }));
  }
}

textDocuments.TextDocuments = TextDocuments;

Object.defineProperty(notebook, '__esModule', {
  value: true
});

notebook.NotebookDocuments = notebook.NotebookSyncFeature = void 0;

const vscode_languageserver_protocol_1$3 = main$2;

const textDocuments_1 = textDocuments;

const NotebookSyncFeature = Base => class extends Base {
  get synchronization() {
    return {
      onDidOpenNotebookDocument: handler => this.connection.onNotification(vscode_languageserver_protocol_1$3.DidOpenNotebookDocumentNotification.type, (params => {
        handler(params);
      })),
      onDidChangeNotebookDocument: handler => this.connection.onNotification(vscode_languageserver_protocol_1$3.DidChangeNotebookDocumentNotification.type, (params => {
        handler(params);
      })),
      onDidSaveNotebookDocument: handler => this.connection.onNotification(vscode_languageserver_protocol_1$3.DidSaveNotebookDocumentNotification.type, (params => {
        handler(params);
      })),
      onDidCloseNotebookDocument: handler => this.connection.onNotification(vscode_languageserver_protocol_1$3.DidCloseNotebookDocumentNotification.type, (params => {
        handler(params);
      }))
    };
  }
};

notebook.NotebookSyncFeature = NotebookSyncFeature;

class CellTextDocumentConnection {
  onDidOpenTextDocument(handler) {
    this.openHandler = handler;
    return vscode_languageserver_protocol_1$3.Disposable.create((() => {
      this.openHandler = undefined;
    }));
  }
  openTextDocument(params) {
    this.openHandler && this.openHandler(params);
  }
  onDidChangeTextDocument(handler) {
    this.changeHandler = handler;
    return vscode_languageserver_protocol_1$3.Disposable.create((() => {
      this.changeHandler = handler;
    }));
  }
  changeTextDocument(params) {
    this.changeHandler && this.changeHandler(params);
  }
  onDidCloseTextDocument(handler) {
    this.closeHandler = handler;
    return vscode_languageserver_protocol_1$3.Disposable.create((() => {
      this.closeHandler = undefined;
    }));
  }
  closeTextDocument(params) {
    this.closeHandler && this.closeHandler(params);
  }
  onWillSaveTextDocument() {
    return CellTextDocumentConnection.NULL_DISPOSE;
  }
  onWillSaveTextDocumentWaitUntil() {
    return CellTextDocumentConnection.NULL_DISPOSE;
  }
  onDidSaveTextDocument() {
    return CellTextDocumentConnection.NULL_DISPOSE;
  }
}

CellTextDocumentConnection.NULL_DISPOSE = Object.freeze({
  dispose: () => {}
});

class NotebookDocuments {
  constructor(configurationOrTextDocuments) {
    if (configurationOrTextDocuments instanceof textDocuments_1.TextDocuments) {
      this._cellTextDocuments = configurationOrTextDocuments;
    } else {
      this._cellTextDocuments = new textDocuments_1.TextDocuments(configurationOrTextDocuments);
    }
    this.notebookDocuments = new Map;
    this.notebookCellMap = new Map;
    this._onDidOpen = new vscode_languageserver_protocol_1$3.Emitter;
    this._onDidChange = new vscode_languageserver_protocol_1$3.Emitter;
    this._onDidSave = new vscode_languageserver_protocol_1$3.Emitter;
    this._onDidClose = new vscode_languageserver_protocol_1$3.Emitter;
  }
  get cellTextDocuments() {
    return this._cellTextDocuments;
  }
  getCellTextDocument(cell) {
    return this._cellTextDocuments.get(cell.document);
  }
  getNotebookDocument(uri) {
    return this.notebookDocuments.get(uri);
  }
  getNotebookCell(uri) {
    const value = this.notebookCellMap.get(uri);
    return value && value[0];
  }
  findNotebookDocumentForCell(cell) {
    const key = typeof cell === 'string' ? cell : cell.document;
    const value = this.notebookCellMap.get(key);
    return value && value[1];
  }
  get onDidOpen() {
    return this._onDidOpen.event;
  }
  get onDidSave() {
    return this._onDidSave.event;
  }
  get onDidChange() {
    return this._onDidChange.event;
  }
  get onDidClose() {
    return this._onDidClose.event;
  }
  listen(connection) {
    const cellTextDocumentConnection = new CellTextDocumentConnection;
    const disposables = [];
    disposables.push(this.cellTextDocuments.listen(cellTextDocumentConnection));
    disposables.push(connection.notebooks.synchronization.onDidOpenNotebookDocument((params => {
      this.notebookDocuments.set(params.notebookDocument.uri, params.notebookDocument);
      for (const cellTextDocument of params.cellTextDocuments) {
        cellTextDocumentConnection.openTextDocument({
          textDocument: cellTextDocument
        });
      }
      this.updateCellMap(params.notebookDocument);
      this._onDidOpen.fire(params.notebookDocument);
    })));
    disposables.push(connection.notebooks.synchronization.onDidChangeNotebookDocument((params => {
      const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
      if (notebookDocument === undefined) {
        return;
      }
      notebookDocument.version = params.notebookDocument.version;
      const oldMetadata = notebookDocument.metadata;
      let metadataChanged = false;
      const change = params.change;
      if (change.metadata !== undefined) {
        metadataChanged = true;
        notebookDocument.metadata = change.metadata;
      }
      const opened = [];
      const closed = [];
      const data = [];
      const text = [];
      if (change.cells !== undefined) {
        const changedCells = change.cells;
        if (changedCells.structure !== undefined) {
          const array = changedCells.structure.array;
          notebookDocument.cells.splice(array.start, array.deleteCount, ...array.cells !== undefined ? array.cells : []);
          if (changedCells.structure.didOpen !== undefined) {
            for (const open of changedCells.structure.didOpen) {
              cellTextDocumentConnection.openTextDocument({
                textDocument: open
              });
              opened.push(open.uri);
            }
          }
          if (changedCells.structure.didClose) {
            for (const close of changedCells.structure.didClose) {
              cellTextDocumentConnection.closeTextDocument({
                textDocument: close
              });
              closed.push(close.uri);
            }
          }
        }
        if (changedCells.data !== undefined) {
          const cellUpdates = new Map(changedCells.data.map((cell => [ cell.document, cell ])));
          for (let i = 0; i <= notebookDocument.cells.length; i++) {
            const change = cellUpdates.get(notebookDocument.cells[i].document);
            if (change !== undefined) {
              const old = notebookDocument.cells.splice(i, 1, change);
              data.push({
                old: old[0],
                new: change
              });
              cellUpdates.delete(change.document);
              if (cellUpdates.size === 0) {
                break;
              }
            }
          }
        }
        if (changedCells.textContent !== undefined) {
          for (const cellTextDocument of changedCells.textContent) {
            cellTextDocumentConnection.changeTextDocument({
              textDocument: cellTextDocument.document,
              contentChanges: cellTextDocument.changes
            });
            text.push(cellTextDocument.document.uri);
          }
        }
      }
      this.updateCellMap(notebookDocument);
      const changeEvent = {
        notebookDocument: notebookDocument
      };
      if (metadataChanged) {
        changeEvent.metadata = {
          old: oldMetadata,
          new: notebookDocument.metadata
        };
      }
      const added = [];
      for (const open of opened) {
        added.push(this.getNotebookCell(open));
      }
      const removed = [];
      for (const close of closed) {
        removed.push(this.getNotebookCell(close));
      }
      const textContent = [];
      for (const change of text) {
        textContent.push(this.getNotebookCell(change));
      }
      if (added.length > 0 || removed.length > 0 || data.length > 0 || textContent.length > 0) {
        changeEvent.cells = {
          added: added,
          removed: removed,
          changed: {
            data: data,
            textContent: textContent
          }
        };
      }
      if (changeEvent.metadata !== undefined || changeEvent.cells !== undefined) {
        this._onDidChange.fire(changeEvent);
      }
    })));
    disposables.push(connection.notebooks.synchronization.onDidSaveNotebookDocument((params => {
      const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
      if (notebookDocument === undefined) {
        return;
      }
      this._onDidSave.fire(notebookDocument);
    })));
    disposables.push(connection.notebooks.synchronization.onDidCloseNotebookDocument((params => {
      const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
      if (notebookDocument === undefined) {
        return;
      }
      this._onDidClose.fire(notebookDocument);
      for (const cellTextDocument of params.cellTextDocuments) {
        cellTextDocumentConnection.closeTextDocument({
          textDocument: cellTextDocument
        });
      }
      this.notebookDocuments.delete(params.notebookDocument.uri);
      for (const cell of notebookDocument.cells) {
        this.notebookCellMap.delete(cell.document);
      }
    })));
    return vscode_languageserver_protocol_1$3.Disposable.create((() => {
      disposables.forEach((disposable => disposable.dispose()));
    }));
  }
  updateCellMap(notebookDocument) {
    for (const cell of notebookDocument.cells) {
      this.notebookCellMap.set(cell.document, [ cell, notebookDocument ]);
    }
  }
}

notebook.NotebookDocuments = NotebookDocuments;

var moniker = {};

Object.defineProperty(moniker, '__esModule', {
  value: true
});

moniker.MonikerFeature = void 0;

const vscode_languageserver_protocol_1$2 = main$2;

const MonikerFeature = Base => class extends Base {
  get moniker() {
    return {
      on: handler => {
        const type = vscode_languageserver_protocol_1$2.MonikerRequest.type;
        return this.connection.onRequest(type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params))));
      }
    };
  }
};

moniker.MonikerFeature = MonikerFeature;

Object.defineProperty(server, '__esModule', {
  value: true
});

server.createConnection = server.combineFeatures = server.combineNotebooksFeatures = server.combineLanguagesFeatures = server.combineWorkspaceFeatures = server.combineWindowFeatures = server.combineClientFeatures = server.combineTracerFeatures = server.combineTelemetryFeatures = server.combineConsoleFeatures = server._NotebooksImpl = server._LanguagesImpl = server.BulkUnregistration = server.BulkRegistration = server.ErrorMessageTracker = void 0;

const vscode_languageserver_protocol_1$1 = main$2;

const Is = is$2;

const UUID = uuid;

const progress_1 = progress;

const configuration_1 = configuration;

const workspaceFolder_1 = workspaceFolder;

const callHierarchy_1 = callHierarchy;

const semanticTokens_1 = semanticTokens;

const showDocument_1 = showDocument;

const fileOperations_1 = fileOperations;

const linkedEditingRange_1 = linkedEditingRange;

const typeHierarchy_1 = typeHierarchy;

const inlineValue_1 = inlineValue;

const foldingRange_1 = foldingRange;

const inlayHint_1 = inlayHint;

const diagnostic_1 = diagnostic;

const notebook_1 = notebook;

const moniker_1 = moniker;

function null2Undefined(value) {
  if (value === null) {
    return undefined;
  }
  return value;
}

class ErrorMessageTracker {
  constructor() {
    this._messages = Object.create(null);
  }
  add(message) {
    let count = this._messages[message];
    if (!count) {
      count = 0;
    }
    count++;
    this._messages[message] = count;
  }
  sendErrors(connection) {
    Object.keys(this._messages).forEach((message => {
      connection.window.showErrorMessage(message);
    }));
  }
}

server.ErrorMessageTracker = ErrorMessageTracker;

class RemoteConsoleImpl {
  constructor() {}
  rawAttach(connection) {
    this._rawConnection = connection;
  }
  attach(connection) {
    this._connection = connection;
  }
  get connection() {
    if (!this._connection) {
      throw new Error('Remote is not attached to a connection yet.');
    }
    return this._connection;
  }
  fillServerCapabilities(_capabilities) {}
  initialize(_capabilities) {}
  error(message) {
    this.send(vscode_languageserver_protocol_1$1.MessageType.Error, message);
  }
  warn(message) {
    this.send(vscode_languageserver_protocol_1$1.MessageType.Warning, message);
  }
  info(message) {
    this.send(vscode_languageserver_protocol_1$1.MessageType.Info, message);
  }
  log(message) {
    this.send(vscode_languageserver_protocol_1$1.MessageType.Log, message);
  }
  debug(message) {
    this.send(vscode_languageserver_protocol_1$1.MessageType.Debug, message);
  }
  send(type, message) {
    if (this._rawConnection) {
      this._rawConnection.sendNotification(vscode_languageserver_protocol_1$1.LogMessageNotification.type, {
        type: type,
        message: message
      }).catch((() => {
        (0, vscode_languageserver_protocol_1$1.RAL)().console.error(`Sending log message failed`);
      }));
    }
  }
}

class _RemoteWindowImpl {
  constructor() {}
  attach(connection) {
    this._connection = connection;
  }
  get connection() {
    if (!this._connection) {
      throw new Error('Remote is not attached to a connection yet.');
    }
    return this._connection;
  }
  initialize(_capabilities) {}
  fillServerCapabilities(_capabilities) {}
  showErrorMessage(message, ...actions) {
    let params = {
      type: vscode_languageserver_protocol_1$1.MessageType.Error,
      message: message,
      actions: actions
    };
    return this.connection.sendRequest(vscode_languageserver_protocol_1$1.ShowMessageRequest.type, params).then(null2Undefined);
  }
  showWarningMessage(message, ...actions) {
    let params = {
      type: vscode_languageserver_protocol_1$1.MessageType.Warning,
      message: message,
      actions: actions
    };
    return this.connection.sendRequest(vscode_languageserver_protocol_1$1.ShowMessageRequest.type, params).then(null2Undefined);
  }
  showInformationMessage(message, ...actions) {
    let params = {
      type: vscode_languageserver_protocol_1$1.MessageType.Info,
      message: message,
      actions: actions
    };
    return this.connection.sendRequest(vscode_languageserver_protocol_1$1.ShowMessageRequest.type, params).then(null2Undefined);
  }
}

const RemoteWindowImpl = (0, showDocument_1.ShowDocumentFeature)((0, progress_1.ProgressFeature)(_RemoteWindowImpl));

var BulkRegistration;

(function(BulkRegistration) {
  function create() {
    return new BulkRegistrationImpl;
  }
  BulkRegistration.create = create;
})(BulkRegistration || (server.BulkRegistration = BulkRegistration = {}));

class BulkRegistrationImpl {
  constructor() {
    this._registrations = [];
    this._registered = new Set;
  }
  add(type, registerOptions) {
    const method = Is.string(type) ? type : type.method;
    if (this._registered.has(method)) {
      throw new Error(`${method} is already added to this registration`);
    }
    const id = UUID.generateUuid();
    this._registrations.push({
      id: id,
      method: method,
      registerOptions: registerOptions || {}
    });
    this._registered.add(method);
  }
  asRegistrationParams() {
    return {
      registrations: this._registrations
    };
  }
}

var BulkUnregistration;

(function(BulkUnregistration) {
  function create() {
    return new BulkUnregistrationImpl(undefined, []);
  }
  BulkUnregistration.create = create;
})(BulkUnregistration || (server.BulkUnregistration = BulkUnregistration = {}));

class BulkUnregistrationImpl {
  constructor(_connection, unregistrations) {
    this._connection = _connection;
    this._unregistrations = new Map;
    unregistrations.forEach((unregistration => {
      this._unregistrations.set(unregistration.method, unregistration);
    }));
  }
  get isAttached() {
    return !!this._connection;
  }
  attach(connection) {
    this._connection = connection;
  }
  add(unregistration) {
    this._unregistrations.set(unregistration.method, unregistration);
  }
  dispose() {
    let unregistrations = [];
    for (let unregistration of this._unregistrations.values()) {
      unregistrations.push(unregistration);
    }
    let params = {
      unregisterations: unregistrations
    };
    this._connection.sendRequest(vscode_languageserver_protocol_1$1.UnregistrationRequest.type, params).catch((() => {
      this._connection.console.info(`Bulk unregistration failed.`);
    }));
  }
  disposeSingle(arg) {
    const method = Is.string(arg) ? arg : arg.method;
    const unregistration = this._unregistrations.get(method);
    if (!unregistration) {
      return false;
    }
    let params = {
      unregisterations: [ unregistration ]
    };
    this._connection.sendRequest(vscode_languageserver_protocol_1$1.UnregistrationRequest.type, params).then((() => {
      this._unregistrations.delete(method);
    }), (_error => {
      this._connection.console.info(`Un-registering request handler for ${unregistration.id} failed.`);
    }));
    return true;
  }
}

class RemoteClientImpl {
  attach(connection) {
    this._connection = connection;
  }
  get connection() {
    if (!this._connection) {
      throw new Error('Remote is not attached to a connection yet.');
    }
    return this._connection;
  }
  initialize(_capabilities) {}
  fillServerCapabilities(_capabilities) {}
  register(typeOrRegistrations, registerOptionsOrType, registerOptions) {
    if (typeOrRegistrations instanceof BulkRegistrationImpl) {
      return this.registerMany(typeOrRegistrations);
    } else if (typeOrRegistrations instanceof BulkUnregistrationImpl) {
      return this.registerSingle1(typeOrRegistrations, registerOptionsOrType, registerOptions);
    } else {
      return this.registerSingle2(typeOrRegistrations, registerOptionsOrType);
    }
  }
  registerSingle1(unregistration, type, registerOptions) {
    const method = Is.string(type) ? type : type.method;
    const id = UUID.generateUuid();
    let params = {
      registrations: [ {
        id: id,
        method: method,
        registerOptions: registerOptions || {}
      } ]
    };
    if (!unregistration.isAttached) {
      unregistration.attach(this.connection);
    }
    return this.connection.sendRequest(vscode_languageserver_protocol_1$1.RegistrationRequest.type, params).then((_result => {
      unregistration.add({
        id: id,
        method: method
      });
      return unregistration;
    }), (_error => {
      this.connection.console.info(`Registering request handler for ${method} failed.`);
      return Promise.reject(_error);
    }));
  }
  registerSingle2(type, registerOptions) {
    const method = Is.string(type) ? type : type.method;
    const id = UUID.generateUuid();
    let params = {
      registrations: [ {
        id: id,
        method: method,
        registerOptions: registerOptions || {}
      } ]
    };
    return this.connection.sendRequest(vscode_languageserver_protocol_1$1.RegistrationRequest.type, params).then((_result => vscode_languageserver_protocol_1$1.Disposable.create((() => {
      this.unregisterSingle(id, method).catch((() => {
        this.connection.console.info(`Un-registering capability with id ${id} failed.`);
      }));
    }))), (_error => {
      this.connection.console.info(`Registering request handler for ${method} failed.`);
      return Promise.reject(_error);
    }));
  }
  unregisterSingle(id, method) {
    let params = {
      unregisterations: [ {
        id: id,
        method: method
      } ]
    };
    return this.connection.sendRequest(vscode_languageserver_protocol_1$1.UnregistrationRequest.type, params).catch((() => {
      this.connection.console.info(`Un-registering request handler for ${id} failed.`);
    }));
  }
  registerMany(registrations) {
    let params = registrations.asRegistrationParams();
    return this.connection.sendRequest(vscode_languageserver_protocol_1$1.RegistrationRequest.type, params).then((() => new BulkUnregistrationImpl(this._connection, params.registrations.map((registration => ({
      id: registration.id,
      method: registration.method
    }))))), (_error => {
      this.connection.console.info(`Bulk registration failed.`);
      return Promise.reject(_error);
    }));
  }
}

class _RemoteWorkspaceImpl {
  constructor() {}
  attach(connection) {
    this._connection = connection;
  }
  get connection() {
    if (!this._connection) {
      throw new Error('Remote is not attached to a connection yet.');
    }
    return this._connection;
  }
  initialize(_capabilities) {}
  fillServerCapabilities(_capabilities) {}
  applyEdit(paramOrEdit) {
    function isApplyWorkspaceEditParams(value) {
      return value && !!value.edit;
    }
    let params = isApplyWorkspaceEditParams(paramOrEdit) ? paramOrEdit : {
      edit: paramOrEdit
    };
    return this.connection.sendRequest(vscode_languageserver_protocol_1$1.ApplyWorkspaceEditRequest.type, params);
  }
}

const RemoteWorkspaceImpl = (0, fileOperations_1.FileOperationsFeature)((0, workspaceFolder_1.WorkspaceFoldersFeature)((0, 
configuration_1.ConfigurationFeature)(_RemoteWorkspaceImpl)));

class TracerImpl {
  constructor() {
    this._trace = vscode_languageserver_protocol_1$1.Trace.Off;
  }
  attach(connection) {
    this._connection = connection;
  }
  get connection() {
    if (!this._connection) {
      throw new Error('Remote is not attached to a connection yet.');
    }
    return this._connection;
  }
  initialize(_capabilities) {}
  fillServerCapabilities(_capabilities) {}
  set trace(value) {
    this._trace = value;
  }
  log(message, verbose) {
    if (this._trace === vscode_languageserver_protocol_1$1.Trace.Off) {
      return;
    }
    this.connection.sendNotification(vscode_languageserver_protocol_1$1.LogTraceNotification.type, {
      message: message,
      verbose: this._trace === vscode_languageserver_protocol_1$1.Trace.Verbose ? verbose : undefined
    }).catch((() => {}));
  }
}

class TelemetryImpl {
  constructor() {}
  attach(connection) {
    this._connection = connection;
  }
  get connection() {
    if (!this._connection) {
      throw new Error('Remote is not attached to a connection yet.');
    }
    return this._connection;
  }
  initialize(_capabilities) {}
  fillServerCapabilities(_capabilities) {}
  logEvent(data) {
    this.connection.sendNotification(vscode_languageserver_protocol_1$1.TelemetryEventNotification.type, data).catch((() => {
      this.connection.console.log(`Sending TelemetryEventNotification failed`);
    }));
  }
}

class _LanguagesImpl {
  constructor() {}
  attach(connection) {
    this._connection = connection;
  }
  get connection() {
    if (!this._connection) {
      throw new Error('Remote is not attached to a connection yet.');
    }
    return this._connection;
  }
  initialize(_capabilities) {}
  fillServerCapabilities(_capabilities) {}
  attachWorkDoneProgress(params) {
    return (0, progress_1.attachWorkDone)(this.connection, params);
  }
  attachPartialResultProgress(_type, params) {
    return (0, progress_1.attachPartialResult)(this.connection, params);
  }
}

server._LanguagesImpl = _LanguagesImpl;

const LanguagesImpl = (0, foldingRange_1.FoldingRangeFeature)((0, moniker_1.MonikerFeature)((0, 
diagnostic_1.DiagnosticFeature)((0, inlayHint_1.InlayHintFeature)((0, inlineValue_1.InlineValueFeature)((0, 
typeHierarchy_1.TypeHierarchyFeature)((0, linkedEditingRange_1.LinkedEditingRangeFeature)((0, 
semanticTokens_1.SemanticTokensFeature)((0, callHierarchy_1.CallHierarchyFeature)(_LanguagesImpl)))))))));

class _NotebooksImpl {
  constructor() {}
  attach(connection) {
    this._connection = connection;
  }
  get connection() {
    if (!this._connection) {
      throw new Error('Remote is not attached to a connection yet.');
    }
    return this._connection;
  }
  initialize(_capabilities) {}
  fillServerCapabilities(_capabilities) {}
  attachWorkDoneProgress(params) {
    return (0, progress_1.attachWorkDone)(this.connection, params);
  }
  attachPartialResultProgress(_type, params) {
    return (0, progress_1.attachPartialResult)(this.connection, params);
  }
}

server._NotebooksImpl = _NotebooksImpl;

const NotebooksImpl = (0, notebook_1.NotebookSyncFeature)(_NotebooksImpl);

function combineConsoleFeatures(one, two) {
  return function(Base) {
    return two(one(Base));
  };
}

server.combineConsoleFeatures = combineConsoleFeatures;

function combineTelemetryFeatures(one, two) {
  return function(Base) {
    return two(one(Base));
  };
}

server.combineTelemetryFeatures = combineTelemetryFeatures;

function combineTracerFeatures(one, two) {
  return function(Base) {
    return two(one(Base));
  };
}

server.combineTracerFeatures = combineTracerFeatures;

function combineClientFeatures(one, two) {
  return function(Base) {
    return two(one(Base));
  };
}

server.combineClientFeatures = combineClientFeatures;

function combineWindowFeatures(one, two) {
  return function(Base) {
    return two(one(Base));
  };
}

server.combineWindowFeatures = combineWindowFeatures;

function combineWorkspaceFeatures(one, two) {
  return function(Base) {
    return two(one(Base));
  };
}

server.combineWorkspaceFeatures = combineWorkspaceFeatures;

function combineLanguagesFeatures(one, two) {
  return function(Base) {
    return two(one(Base));
  };
}

server.combineLanguagesFeatures = combineLanguagesFeatures;

function combineNotebooksFeatures(one, two) {
  return function(Base) {
    return two(one(Base));
  };
}

server.combineNotebooksFeatures = combineNotebooksFeatures;

function combineFeatures(one, two) {
  function combine(one, two, func) {
    if (one && two) {
      return func(one, two);
    } else if (one) {
      return one;
    } else {
      return two;
    }
  }
  let result = {
    __brand: 'features',
    console: combine(one.console, two.console, combineConsoleFeatures),
    tracer: combine(one.tracer, two.tracer, combineTracerFeatures),
    telemetry: combine(one.telemetry, two.telemetry, combineTelemetryFeatures),
    client: combine(one.client, two.client, combineClientFeatures),
    window: combine(one.window, two.window, combineWindowFeatures),
    workspace: combine(one.workspace, two.workspace, combineWorkspaceFeatures),
    languages: combine(one.languages, two.languages, combineLanguagesFeatures),
    notebooks: combine(one.notebooks, two.notebooks, combineNotebooksFeatures)
  };
  return result;
}

server.combineFeatures = combineFeatures;

function createConnection(connectionFactory, watchDog, factories) {
  const logger = factories && factories.console ? new (factories.console(RemoteConsoleImpl)) : new RemoteConsoleImpl;
  const connection = connectionFactory(logger);
  logger.rawAttach(connection);
  const tracer = factories && factories.tracer ? new (factories.tracer(TracerImpl)) : new TracerImpl;
  const telemetry = factories && factories.telemetry ? new (factories.telemetry(TelemetryImpl)) : new TelemetryImpl;
  const client = factories && factories.client ? new (factories.client(RemoteClientImpl)) : new RemoteClientImpl;
  const remoteWindow = factories && factories.window ? new (factories.window(RemoteWindowImpl)) : new RemoteWindowImpl;
  const workspace = factories && factories.workspace ? new (factories.workspace(RemoteWorkspaceImpl)) : new RemoteWorkspaceImpl;
  const languages = factories && factories.languages ? new (factories.languages(LanguagesImpl)) : new LanguagesImpl;
  const notebooks = factories && factories.notebooks ? new (factories.notebooks(NotebooksImpl)) : new NotebooksImpl;
  const allRemotes = [ logger, tracer, telemetry, client, remoteWindow, workspace, languages, notebooks ];
  function asPromise(value) {
    if (value instanceof Promise) {
      return value;
    } else if (Is.thenable(value)) {
      return new Promise(((resolve, reject) => {
        value.then((resolved => resolve(resolved)), (error => reject(error)));
      }));
    } else {
      return Promise.resolve(value);
    }
  }
  let shutdownHandler = undefined;
  let initializeHandler = undefined;
  let exitHandler = undefined;
  let protocolConnection = {
    listen: () => connection.listen(),
    sendRequest: (type, ...params) => connection.sendRequest(Is.string(type) ? type : type.method, ...params),
    onRequest: (type, handler) => connection.onRequest(type, handler),
    sendNotification: (type, param) => {
      const method = Is.string(type) ? type : type.method;
      return connection.sendNotification(method, param);
    },
    onNotification: (type, handler) => connection.onNotification(type, handler),
    onProgress: connection.onProgress,
    sendProgress: connection.sendProgress,
    onInitialize: handler => {
      initializeHandler = handler;
      return {
        dispose: () => {
          initializeHandler = undefined;
        }
      };
    },
    onInitialized: handler => connection.onNotification(vscode_languageserver_protocol_1$1.InitializedNotification.type, handler),
    onShutdown: handler => {
      shutdownHandler = handler;
      return {
        dispose: () => {
          shutdownHandler = undefined;
        }
      };
    },
    onExit: handler => {
      exitHandler = handler;
      return {
        dispose: () => {
          exitHandler = undefined;
        }
      };
    },
    get console() {
      return logger;
    },
    get telemetry() {
      return telemetry;
    },
    get tracer() {
      return tracer;
    },
    get client() {
      return client;
    },
    get window() {
      return remoteWindow;
    },
    get workspace() {
      return workspace;
    },
    get languages() {
      return languages;
    },
    get notebooks() {
      return notebooks;
    },
    onDidChangeConfiguration: handler => connection.onNotification(vscode_languageserver_protocol_1$1.DidChangeConfigurationNotification.type, handler),
    onDidChangeWatchedFiles: handler => connection.onNotification(vscode_languageserver_protocol_1$1.DidChangeWatchedFilesNotification.type, handler),
    __textDocumentSync: undefined,
    onDidOpenTextDocument: handler => connection.onNotification(vscode_languageserver_protocol_1$1.DidOpenTextDocumentNotification.type, handler),
    onDidChangeTextDocument: handler => connection.onNotification(vscode_languageserver_protocol_1$1.DidChangeTextDocumentNotification.type, handler),
    onDidCloseTextDocument: handler => connection.onNotification(vscode_languageserver_protocol_1$1.DidCloseTextDocumentNotification.type, handler),
    onWillSaveTextDocument: handler => connection.onNotification(vscode_languageserver_protocol_1$1.WillSaveTextDocumentNotification.type, handler),
    onWillSaveTextDocumentWaitUntil: handler => connection.onRequest(vscode_languageserver_protocol_1$1.WillSaveTextDocumentWaitUntilRequest.type, handler),
    onDidSaveTextDocument: handler => connection.onNotification(vscode_languageserver_protocol_1$1.DidSaveTextDocumentNotification.type, handler),
    sendDiagnostics: params => connection.sendNotification(vscode_languageserver_protocol_1$1.PublishDiagnosticsNotification.type, params),
    onHover: handler => connection.onRequest(vscode_languageserver_protocol_1$1.HoverRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), undefined))),
    onCompletion: handler => connection.onRequest(vscode_languageserver_protocol_1$1.CompletionRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onCompletionResolve: handler => connection.onRequest(vscode_languageserver_protocol_1$1.CompletionResolveRequest.type, handler),
    onSignatureHelp: handler => connection.onRequest(vscode_languageserver_protocol_1$1.SignatureHelpRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), undefined))),
    onDeclaration: handler => connection.onRequest(vscode_languageserver_protocol_1$1.DeclarationRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onDefinition: handler => connection.onRequest(vscode_languageserver_protocol_1$1.DefinitionRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onTypeDefinition: handler => connection.onRequest(vscode_languageserver_protocol_1$1.TypeDefinitionRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onImplementation: handler => connection.onRequest(vscode_languageserver_protocol_1$1.ImplementationRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onReferences: handler => connection.onRequest(vscode_languageserver_protocol_1$1.ReferencesRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onDocumentHighlight: handler => connection.onRequest(vscode_languageserver_protocol_1$1.DocumentHighlightRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onDocumentSymbol: handler => connection.onRequest(vscode_languageserver_protocol_1$1.DocumentSymbolRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onWorkspaceSymbol: handler => connection.onRequest(vscode_languageserver_protocol_1$1.WorkspaceSymbolRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onWorkspaceSymbolResolve: handler => connection.onRequest(vscode_languageserver_protocol_1$1.WorkspaceSymbolResolveRequest.type, handler),
    onCodeAction: handler => connection.onRequest(vscode_languageserver_protocol_1$1.CodeActionRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onCodeActionResolve: handler => connection.onRequest(vscode_languageserver_protocol_1$1.CodeActionResolveRequest.type, ((params, cancel) => handler(params, cancel))),
    onCodeLens: handler => connection.onRequest(vscode_languageserver_protocol_1$1.CodeLensRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onCodeLensResolve: handler => connection.onRequest(vscode_languageserver_protocol_1$1.CodeLensResolveRequest.type, ((params, cancel) => handler(params, cancel))),
    onDocumentFormatting: handler => connection.onRequest(vscode_languageserver_protocol_1$1.DocumentFormattingRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), undefined))),
    onDocumentRangeFormatting: handler => connection.onRequest(vscode_languageserver_protocol_1$1.DocumentRangeFormattingRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), undefined))),
    onDocumentOnTypeFormatting: handler => connection.onRequest(vscode_languageserver_protocol_1$1.DocumentOnTypeFormattingRequest.type, ((params, cancel) => handler(params, cancel))),
    onRenameRequest: handler => connection.onRequest(vscode_languageserver_protocol_1$1.RenameRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), undefined))),
    onPrepareRename: handler => connection.onRequest(vscode_languageserver_protocol_1$1.PrepareRenameRequest.type, ((params, cancel) => handler(params, cancel))),
    onDocumentLinks: handler => connection.onRequest(vscode_languageserver_protocol_1$1.DocumentLinkRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onDocumentLinkResolve: handler => connection.onRequest(vscode_languageserver_protocol_1$1.DocumentLinkResolveRequest.type, ((params, cancel) => handler(params, cancel))),
    onDocumentColor: handler => connection.onRequest(vscode_languageserver_protocol_1$1.DocumentColorRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onColorPresentation: handler => connection.onRequest(vscode_languageserver_protocol_1$1.ColorPresentationRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onFoldingRanges: handler => connection.onRequest(vscode_languageserver_protocol_1$1.FoldingRangeRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onSelectionRanges: handler => connection.onRequest(vscode_languageserver_protocol_1$1.SelectionRangeRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), (0, progress_1.attachPartialResult)(connection, params)))),
    onExecuteCommand: handler => connection.onRequest(vscode_languageserver_protocol_1$1.ExecuteCommandRequest.type, ((params, cancel) => handler(params, cancel, (0, 
    progress_1.attachWorkDone)(connection, params), undefined))),
    dispose: () => connection.dispose()
  };
  for (let remote of allRemotes) {
    remote.attach(protocolConnection);
  }
  connection.onRequest(vscode_languageserver_protocol_1$1.InitializeRequest.type, (params => {
    watchDog.initialize(params);
    if (Is.string(params.trace)) {
      tracer.trace = vscode_languageserver_protocol_1$1.Trace.fromString(params.trace);
    }
    for (let remote of allRemotes) {
      remote.initialize(params.capabilities);
    }
    if (initializeHandler) {
      let result = initializeHandler(params, (new vscode_languageserver_protocol_1$1.CancellationTokenSource).token, (0, 
      progress_1.attachWorkDone)(connection, params), undefined);
      return asPromise(result).then((value => {
        if (value instanceof vscode_languageserver_protocol_1$1.ResponseError) {
          return value;
        }
        let result = value;
        if (!result) {
          result = {
            capabilities: {}
          };
        }
        let capabilities = result.capabilities;
        if (!capabilities) {
          capabilities = {};
          result.capabilities = capabilities;
        }
        if (capabilities.textDocumentSync === undefined || capabilities.textDocumentSync === null) {
          capabilities.textDocumentSync = Is.number(protocolConnection.__textDocumentSync) ? protocolConnection.__textDocumentSync : vscode_languageserver_protocol_1$1.TextDocumentSyncKind.None;
        } else if (!Is.number(capabilities.textDocumentSync) && !Is.number(capabilities.textDocumentSync.change)) {
          capabilities.textDocumentSync.change = Is.number(protocolConnection.__textDocumentSync) ? protocolConnection.__textDocumentSync : vscode_languageserver_protocol_1$1.TextDocumentSyncKind.None;
        }
        for (let remote of allRemotes) {
          remote.fillServerCapabilities(capabilities);
        }
        return result;
      }));
    } else {
      let result = {
        capabilities: {
          textDocumentSync: vscode_languageserver_protocol_1$1.TextDocumentSyncKind.None
        }
      };
      for (let remote of allRemotes) {
        remote.fillServerCapabilities(result.capabilities);
      }
      return result;
    }
  }));
  connection.onRequest(vscode_languageserver_protocol_1$1.ShutdownRequest.type, (() => {
    watchDog.shutdownReceived = true;
    if (shutdownHandler) {
      return shutdownHandler((new vscode_languageserver_protocol_1$1.CancellationTokenSource).token);
    } else {
      return undefined;
    }
  }));
  connection.onNotification(vscode_languageserver_protocol_1$1.ExitNotification.type, (() => {
    try {
      if (exitHandler) {
        exitHandler();
      }
    } finally {
      if (watchDog.shutdownReceived) {
        watchDog.exit(0);
      } else {
        watchDog.exit(1);
      }
    }
  }));
  connection.onNotification(vscode_languageserver_protocol_1$1.SetTraceNotification.type, (params => {
    tracer.trace = vscode_languageserver_protocol_1$1.Trace.fromString(params.value);
  }));
  return protocolConnection;
}

server.createConnection = createConnection;

var files = {};

Object.defineProperty(files, '__esModule', {
  value: true
});

files.resolveModulePath = files.FileSystem = files.resolveGlobalYarnPath = files.resolveGlobalNodePath = files.resolve = files.uriToFilePath = void 0;

const url = require$$0$3;

const path$c = require$$1$1;

const fs$j = require$$0$1;

const child_process_1 = require$$1;

function uriToFilePath(uri) {
  let parsed = url.parse(uri);
  if (parsed.protocol !== 'file:' || !parsed.path) {
    return undefined;
  }
  let segments = parsed.path.split('/');
  for (var i = 0, len = segments.length; i < len; i++) {
    segments[i] = decodeURIComponent(segments[i]);
  }
  if (process.platform === 'win32' && segments.length > 1) {
    let first = segments[0];
    let second = segments[1];
    if (first.length === 0 && second.length > 1 && second[1] === ':') {
      segments.shift();
    }
  }
  return path$c.normalize(segments.join('/'));
}

files.uriToFilePath = uriToFilePath;

function isWindows$1() {
  return process.platform === 'win32';
}

function resolve(moduleName, nodePath, cwd, tracer) {
  const nodePathKey = 'NODE_PATH';
  const app = [ 'var p = process;', 'p.on(\'message\',function(m){', 'if(m.c===\'e\'){', 'p.exit(0);', '}', 'else if(m.c===\'rs\'){', 'try{', 'var r=require.resolve(m.a);', 'p.send({c:\'r\',s:true,r:r});', '}', 'catch(err){', 'p.send({c:\'r\',s:false});', '}', '}', '});' ].join('');
  return new Promise(((resolve, reject) => {
    let env = process.env;
    let newEnv = Object.create(null);
    Object.keys(env).forEach((key => newEnv[key] = env[key]));
    if (nodePath && fs$j.existsSync(nodePath)) {
      if (newEnv[nodePathKey]) {
        newEnv[nodePathKey] = nodePath + path$c.delimiter + newEnv[nodePathKey];
      } else {
        newEnv[nodePathKey] = nodePath;
      }
      if (tracer) {
        tracer(`NODE_PATH value is: ${newEnv[nodePathKey]}`);
      }
    }
    newEnv['ELECTRON_RUN_AS_NODE'] = '1';
    try {
      let cp = (0, child_process_1.fork)('', [], {
        cwd: cwd,
        env: newEnv,
        execArgv: [ '-e', app ]
      });
      if (cp.pid === void 0) {
        reject(new Error(`Starting process to resolve node module  ${moduleName} failed`));
        return;
      }
      cp.on('error', (error => {
        reject(error);
      }));
      cp.on('message', (message => {
        if (message.c === 'r') {
          cp.send({
            c: 'e'
          });
          if (message.s) {
            resolve(message.r);
          } else {
            reject(new Error(`Failed to resolve module: ${moduleName}`));
          }
        }
      }));
      let message = {
        c: 'rs',
        a: moduleName
      };
      cp.send(message);
    } catch (error) {
      reject(error);
    }
  }));
}

files.resolve = resolve;

function resolveGlobalNodePath(tracer) {
  let npmCommand = 'npm';
  const env = Object.create(null);
  Object.keys(process.env).forEach((key => env[key] = process.env[key]));
  env['NO_UPDATE_NOTIFIER'] = 'true';
  const options = {
    encoding: 'utf8',
    env: env
  };
  if (isWindows$1()) {
    npmCommand = 'npm.cmd';
    options.shell = true;
  }
  let handler = () => {};
  try {
    process.on('SIGPIPE', handler);
    let stdout = (0, child_process_1.spawnSync)(npmCommand, [ 'config', 'get', 'prefix' ], options).stdout;
    if (!stdout) {
      if (tracer) {
        tracer(`'npm config get prefix' didn't return a value.`);
      }
      return undefined;
    }
    let prefix = stdout.trim();
    if (tracer) {
      tracer(`'npm config get prefix' value is: ${prefix}`);
    }
    if (prefix.length > 0) {
      if (isWindows$1()) {
        return path$c.join(prefix, 'node_modules');
      } else {
        return path$c.join(prefix, 'lib', 'node_modules');
      }
    }
    return undefined;
  } catch (err) {
    return undefined;
  } finally {
    process.removeListener('SIGPIPE', handler);
  }
}

files.resolveGlobalNodePath = resolveGlobalNodePath;

function resolveGlobalYarnPath(tracer) {
  let yarnCommand = 'yarn';
  let options = {
    encoding: 'utf8'
  };
  if (isWindows$1()) {
    yarnCommand = 'yarn.cmd';
    options.shell = true;
  }
  let handler = () => {};
  try {
    process.on('SIGPIPE', handler);
    let results = (0, child_process_1.spawnSync)(yarnCommand, [ 'global', 'dir', '--json' ], options);
    let stdout = results.stdout;
    if (!stdout) {
      if (tracer) {
        tracer(`'yarn global dir' didn't return a value.`);
        if (results.stderr) {
          tracer(results.stderr);
        }
      }
      return undefined;
    }
    let lines = stdout.trim().split(/\r?\n/);
    for (let line of lines) {
      try {
        let yarn = JSON.parse(line);
        if (yarn.type === 'log') {
          return path$c.join(yarn.data, 'node_modules');
        }
      } catch (e) {}
    }
    return undefined;
  } catch (err) {
    return undefined;
  } finally {
    process.removeListener('SIGPIPE', handler);
  }
}

files.resolveGlobalYarnPath = resolveGlobalYarnPath;

var FileSystem;

(function(FileSystem) {
  let _isCaseSensitive = undefined;
  function isCaseSensitive() {
    if (_isCaseSensitive !== void 0) {
      return _isCaseSensitive;
    }
    if (process.platform === 'win32') {
      _isCaseSensitive = false;
    } else {
      _isCaseSensitive = !fs$j.existsSync(__filename.toUpperCase()) || !fs$j.existsSync(__filename.toLowerCase());
    }
    return _isCaseSensitive;
  }
  FileSystem.isCaseSensitive = isCaseSensitive;
  function isParent(parent, child) {
    if (isCaseSensitive()) {
      return path$c.normalize(child).indexOf(path$c.normalize(parent)) === 0;
    } else {
      return path$c.normalize(child).toLowerCase().indexOf(path$c.normalize(parent).toLowerCase()) === 0;
    }
  }
  FileSystem.isParent = isParent;
})(FileSystem || (files.FileSystem = FileSystem = {}));

function resolveModulePath(workspaceRoot, moduleName, nodePath, tracer) {
  if (nodePath) {
    if (!path$c.isAbsolute(nodePath)) {
      nodePath = path$c.join(workspaceRoot, nodePath);
    }
    return resolve(moduleName, nodePath, nodePath, tracer).then((value => {
      if (FileSystem.isParent(nodePath, value)) {
        return value;
      } else {
        return Promise.reject(new Error(`Failed to load ${moduleName} from node path location.`));
      }
    })).then(undefined, (_error => resolve(moduleName, resolveGlobalNodePath(tracer), workspaceRoot, tracer)));
  } else {
    return resolve(moduleName, resolveGlobalNodePath(tracer), workspaceRoot, tracer);
  }
}

files.resolveModulePath = resolveModulePath;

var node$1 = main$2;

var api = {};

var inlineCompletion_proposed = {};

Object.defineProperty(inlineCompletion_proposed, '__esModule', {
  value: true
});

inlineCompletion_proposed.InlineCompletionFeature = void 0;

const vscode_languageserver_protocol_1 = main$2;

const InlineCompletionFeature = Base => class extends Base {
  get inlineCompletion() {
    return {
      on: handler => this.connection.onRequest(vscode_languageserver_protocol_1.InlineCompletionRequest.type, ((params, cancel) => handler(params, cancel, this.attachWorkDoneProgress(params))))
    };
  }
};

inlineCompletion_proposed.InlineCompletionFeature = InlineCompletionFeature;

(function(exports) {
  var __createBinding = commonjsGlobal && commonjsGlobal.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = {
        enumerable: true,
        get: function() {
          return m[k];
        }
      };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
  });
  var __exportStar = commonjsGlobal && commonjsGlobal.__exportStar || function(m, exports) {
    for (var p in m) if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
  };
  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  exports.ProposedFeatures = exports.NotebookDocuments = exports.TextDocuments = exports.SemanticTokensBuilder = void 0;
  const semanticTokens_1 = semanticTokens;
  Object.defineProperty(exports, 'SemanticTokensBuilder', {
    enumerable: true,
    get: function() {
      return semanticTokens_1.SemanticTokensBuilder;
    }
  });
  const ic = inlineCompletion_proposed;
  __exportStar(main$2, exports);
  const textDocuments_1 = textDocuments;
  Object.defineProperty(exports, 'TextDocuments', {
    enumerable: true,
    get: function() {
      return textDocuments_1.TextDocuments;
    }
  });
  const notebook_1 = notebook;
  Object.defineProperty(exports, 'NotebookDocuments', {
    enumerable: true,
    get: function() {
      return notebook_1.NotebookDocuments;
    }
  });
  __exportStar(server, exports);
  var ProposedFeatures;
  (function(ProposedFeatures) {
    ProposedFeatures.all = {
      __brand: 'features',
      languages: ic.InlineCompletionFeature
    };
  })(ProposedFeatures || (exports.ProposedFeatures = ProposedFeatures = {}));
})(api);

(function(exports) {
  var __createBinding = commonjsGlobal && commonjsGlobal.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = {
        enumerable: true,
        get: function() {
          return m[k];
        }
      };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
  });
  var __exportStar = commonjsGlobal && commonjsGlobal.__exportStar || function(m, exports) {
    for (var p in m) if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
  };
  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  exports.createConnection = exports.Files = void 0;
  const node_util_1 = require$$0$4;
  const Is = is$2;
  const server_1 = server;
  const fm = files;
  const node_1 = node$1;
  __exportStar(node$1, exports);
  __exportStar(api, exports);
  var Files;
  (function(Files) {
    Files.uriToFilePath = fm.uriToFilePath;
    Files.resolveGlobalNodePath = fm.resolveGlobalNodePath;
    Files.resolveGlobalYarnPath = fm.resolveGlobalYarnPath;
    Files.resolve = fm.resolve;
    Files.resolveModulePath = fm.resolveModulePath;
  })(Files || (exports.Files = Files = {}));
  function endProtocolConnection() {
    {
      return;
    }
  }
  let _shutdownReceived = false;
  let exitTimer = undefined;
  function setupExitTimer() {
    const argName = '--clientProcessId';
    function runTimer(value) {
      try {
        let processId = parseInt(value);
        if (!isNaN(processId)) {
          exitTimer = setInterval((() => {
            try {
              process.kill(processId, 0);
            } catch (ex) {
              endProtocolConnection();
              process.exit(_shutdownReceived ? 0 : 1);
            }
          }), 3e3);
        }
      } catch (e) {}
    }
    for (let i = 2; i < process.argv.length; i++) {
      let arg = process.argv[i];
      if (arg === argName && i + 1 < process.argv.length) {
        runTimer(process.argv[i + 1]);
        return;
      } else {
        let args = arg.split('=');
        if (args[0] === argName) {
          runTimer(args[1]);
        }
      }
    }
  }
  setupExitTimer();
  const watchDog = {
    initialize: params => {
      const processId = params.processId;
      if (Is.number(processId) && exitTimer === undefined) {
        setInterval((() => {
          try {
            process.kill(processId, 0);
          } catch (ex) {
            process.exit(_shutdownReceived ? 0 : 1);
          }
        }), 3e3);
      }
    },
    get shutdownReceived() {
      return _shutdownReceived;
    },
    set shutdownReceived(value) {
      _shutdownReceived = value;
    },
    exit: code => {
      process.exit(code);
    }
  };
  function createConnection(arg1, arg2, arg3, arg4) {
    let factories;
    let input;
    let output;
    let options;
    if (arg1 !== void 0 && arg1.__brand === 'features') {
      factories = arg1;
      arg1 = arg2;
      arg2 = arg3;
      arg3 = arg4;
    }
    if (node_1.ConnectionStrategy.is(arg1) || node_1.ConnectionOptions.is(arg1)) {
      options = arg1;
    } else {
      input = arg1;
      output = arg2;
      options = arg3;
    }
    return _createConnection(input, output, options, factories);
  }
  exports.createConnection = createConnection;
  function _createConnection(input, output, options, factories) {
    let stdio = false;
    if (!input && !output && process.argv.length > 2) {
      let port = void 0;
      let pipeName = void 0;
      let argv = process.argv.slice(2);
      for (let i = 0; i < argv.length; i++) {
        let arg = argv[i];
        if (arg === '--node-ipc') {
          input = new node_1.IPCMessageReader(process);
          output = new node_1.IPCMessageWriter(process);
          break;
        } else if (arg === '--stdio') {
          stdio = true;
          input = process.stdin;
          output = process.stdout;
          break;
        } else if (arg === '--socket') {
          port = parseInt(argv[i + 1]);
          break;
        } else if (arg === '--pipe') {
          pipeName = argv[i + 1];
          break;
        } else {
          var args = arg.split('=');
          if (args[0] === '--socket') {
            port = parseInt(args[1]);
            break;
          } else if (args[0] === '--pipe') {
            pipeName = args[1];
            break;
          }
        }
      }
      if (port) {
        let transport = (0, node_1.createServerSocketTransport)(port);
        input = transport[0];
        output = transport[1];
      } else if (pipeName) {
        let transport = (0, node_1.createServerPipeTransport)(pipeName);
        input = transport[0];
        output = transport[1];
      }
    }
    var commandLineMessage = 'Use arguments of createConnection or set command line parameters: \'--node-ipc\', \'--stdio\' or \'--socket={number}\'';
    if (!input) {
      throw new Error('Connection input stream is not set. ' + commandLineMessage);
    }
    if (!output) {
      throw new Error('Connection output stream is not set. ' + commandLineMessage);
    }
    if (Is.func(input.read) && Is.func(input.on)) {
      let inputStream = input;
      inputStream.on('end', (() => {
        process.exit(_shutdownReceived ? 0 : 1);
      }));
      inputStream.on('close', (() => {
        process.exit(_shutdownReceived ? 0 : 1);
      }));
    }
    const connectionFactory = logger => {
      const result = (0, node_1.createProtocolConnection)(input, output, logger, options);
      if (stdio) {
        patchConsole(logger);
      }
      return result;
    };
    return (0, server_1.createConnection)(connectionFactory, watchDog, factories);
  }
  function patchConsole(logger) {
    function serialize(args) {
      return args.map((arg => typeof arg === 'string' ? arg : (0, node_util_1.inspect)(arg))).join(' ');
    }
    const counters = new Map;
    console.assert = function assert(assertion, ...args) {
      if (assertion) {
        return;
      }
      if (args.length === 0) {
        logger.error('Assertion failed');
      } else {
        const [message, ...rest] = args;
        logger.error(`Assertion failed: ${message} ${serialize(rest)}`);
      }
    };
    console.count = function count(label = 'default') {
      const message = String(label);
      let counter = counters.get(message) ?? 0;
      counter += 1;
      counters.set(message, counter);
      logger.log(`${message}: ${message}`);
    };
    console.countReset = function countReset(label) {
      if (label === undefined) {
        counters.clear();
      } else {
        counters.delete(String(label));
      }
    };
    console.debug = function debug(...args) {
      logger.log(serialize(args));
    };
    console.dir = function dir(arg, options) {
      logger.log((0, node_util_1.inspect)(arg, options));
    };
    console.log = function log(...args) {
      logger.log(serialize(args));
    };
    console.error = function error(...args) {
      logger.error(serialize(args));
    };
    console.trace = function trace(...args) {
      const stack = (new Error).stack.replace(/(.+\n){2}/, '');
      let message = 'Trace';
      if (args.length !== 0) {
        message += `: ${serialize(args)}`;
      }
      logger.log(`${message}\n${stack}`);
    };
    console.warn = function warn(...args) {
      logger.warn(serialize(args));
    };
  }
})(main$3);

const lsp$1 = getDefaultExportFromCjs(main$3);

var node = main$3;

const lsp = getDefaultExportFromCjs(node);

var LogLevel;

(function(LogLevel) {
  LogLevel[LogLevel['Error'] = 0] = 'Error';
  LogLevel[LogLevel['Warning'] = 1] = 'Warning';
  LogLevel[LogLevel['Info'] = 2] = 'Info';
  LogLevel[LogLevel['Log'] = 3] = 'Log';
})(LogLevel || (LogLevel = {}));

(function(LogLevel) {
  function fromString(value) {
    switch (value?.toLowerCase()) {
     case 'log':
      return LogLevel.Log;

     case 'info':
      return LogLevel.Info;

     case 'warning':
      return LogLevel.Warning;

     case 'error':
     default:
      return LogLevel.Error;
    }
  }
  LogLevel.fromString = fromString;
  function toString(level) {
    switch (level) {
     case LogLevel.Error:
      return 'error';

     case LogLevel.Warning:
      return 'warning';

     case LogLevel.Info:
      return 'info';

     case LogLevel.Log:
      return 'log';
    }
  }
  LogLevel.toString = toString;
})(LogLevel || (LogLevel = {}));

class LspClientLogger {
  constructor(client, level) {
    this.client = client;
    this.level = level;
  }
  sendMessage(severity, messageObjects, options) {
    if (this.level >= severity || options?.overrideLevel) {
      const message = messageObjects.map((p => {
        if (typeof p === 'object') {
          return JSON.stringify(p, null, 2);
        } else {
          return p;
        }
      })).join(' ');
      this.client.logMessage({
        type: severity,
        message: message
      });
    }
  }
  logLevelToLspMessageType(level) {
    switch (level) {
     case LogLevel.Log:
      return lsp$1.MessageType.Log;

     case LogLevel.Info:
      return lsp$1.MessageType.Info;

     case LogLevel.Warning:
      return lsp$1.MessageType.Warning;

     case LogLevel.Error:
      return lsp$1.MessageType.Error;
    }
  }
  error(...args) {
    this.sendMessage(lsp$1.MessageType.Error, args);
  }
  warn(...args) {
    this.sendMessage(lsp$1.MessageType.Warning, args);
  }
  info(...args) {
    this.sendMessage(lsp$1.MessageType.Info, args);
  }
  log(...args) {
    this.sendMessage(lsp$1.MessageType.Log, args);
  }
  logIgnoringVerbosity(level, ...args) {
    this.sendMessage(this.logLevelToLspMessageType(level), args, {
      overrideLevel: true
    });
  }
  trace(level, message, data) {
    this.logIgnoringVerbosity(LogLevel.Log, `[${level}  - ${now()}] ${message}`);
    if (data) {
      this.logIgnoringVerbosity(LogLevel.Log, data2String(data));
    }
  }
}

class PrefixingLogger {
  constructor(logger, prefix) {
    this.logger = logger;
    this.prefix = prefix;
  }
  error(...args) {
    this.logger.error(this.prefix, ...args);
  }
  warn(...args) {
    this.logger.warn(this.prefix, ...args);
  }
  info(...args) {
    this.logger.info(this.prefix, ...args);
  }
  log(...args) {
    this.logger.log(this.prefix, ...args);
  }
  logIgnoringVerbosity(level, ...args) {
    this.logger.logIgnoringVerbosity(level, this.prefix, ...args);
  }
  trace(level, message, data) {
    this.logIgnoringVerbosity(LogLevel.Log, this.prefix, `[${level}  - ${now()}] ${message}`);
    if (data) {
      this.logIgnoringVerbosity(LogLevel.Log, this.prefix, data2String(data));
    }
  }
}

function now() {
  const now = new Date;
  return `${padLeft(`${now.getUTCHours()}`, 2, '0')}:${padLeft(`${now.getMinutes()}`, 2, '0')}:${padLeft(`${now.getUTCSeconds()}`, 2, '0')}.${now.getMilliseconds()}`;
}

function padLeft(s, n, pad = ' ') {
  return pad.repeat(Math.max(0, n - s.length)) + s;
}

function data2String(data) {
  if (data instanceof Error) {
    return data.stack || data.message;
  }
  if (data.success === false && data.message) {
    return data.message;
  }
  return data.toString();
}

var fs$i = {};

var universalify$1 = {};

universalify$1.fromCallback = function(fn) {
  return Object.defineProperty((function(...args) {
    if (typeof args[args.length - 1] === 'function') fn.apply(this, args); else {
      return new Promise(((resolve, reject) => {
        args.push(((err, res) => err != null ? reject(err) : resolve(res)));
        fn.apply(this, args);
      }));
    }
  }), 'name', {
    value: fn.name
  });
};

universalify$1.fromPromise = function(fn) {
  return Object.defineProperty((function(...args) {
    const cb = args[args.length - 1];
    if (typeof cb !== 'function') return fn.apply(this, args); else {
      args.pop();
      fn.apply(this, args).then((r => cb(null, r)), cb);
    }
  }), 'name', {
    value: fn.name
  });
};

var constants$2 = require$$0$5;

var origCwd = process.cwd;

var cwd = null;

var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;

process.cwd = function() {
  if (!cwd) cwd = origCwd.call(process);
  return cwd;
};

try {
  process.cwd();
} catch (er) {}

if (typeof process.chdir === 'function') {
  var chdir = process.chdir;
  process.chdir = function(d) {
    cwd = null;
    chdir.call(process, d);
  };
  if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
}

var polyfills$1 = patch$3;

function patch$3(fs) {
  if (constants$2.hasOwnProperty('O_SYMLINK') && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
    patchLchmod(fs);
  }
  if (!fs.lutimes) {
    patchLutimes(fs);
  }
  fs.chown = chownFix(fs.chown);
  fs.fchown = chownFix(fs.fchown);
  fs.lchown = chownFix(fs.lchown);
  fs.chmod = chmodFix(fs.chmod);
  fs.fchmod = chmodFix(fs.fchmod);
  fs.lchmod = chmodFix(fs.lchmod);
  fs.chownSync = chownFixSync(fs.chownSync);
  fs.fchownSync = chownFixSync(fs.fchownSync);
  fs.lchownSync = chownFixSync(fs.lchownSync);
  fs.chmodSync = chmodFixSync(fs.chmodSync);
  fs.fchmodSync = chmodFixSync(fs.fchmodSync);
  fs.lchmodSync = chmodFixSync(fs.lchmodSync);
  fs.stat = statFix(fs.stat);
  fs.fstat = statFix(fs.fstat);
  fs.lstat = statFix(fs.lstat);
  fs.statSync = statFixSync(fs.statSync);
  fs.fstatSync = statFixSync(fs.fstatSync);
  fs.lstatSync = statFixSync(fs.lstatSync);
  if (fs.chmod && !fs.lchmod) {
    fs.lchmod = function(path, mode, cb) {
      if (cb) process.nextTick(cb);
    };
    fs.lchmodSync = function() {};
  }
  if (fs.chown && !fs.lchown) {
    fs.lchown = function(path, uid, gid, cb) {
      if (cb) process.nextTick(cb);
    };
    fs.lchownSync = function() {};
  }
  if (platform === 'win32') {
    fs.rename = typeof fs.rename !== 'function' ? fs.rename : function(fs$rename) {
      function rename(from, to, cb) {
        var start = Date.now();
        var backoff = 0;
        fs$rename(from, to, (function CB(er) {
          if (er && (er.code === 'EACCES' || er.code === 'EPERM' || er.code === 'EBUSY') && Date.now() - start < 6e4) {
            setTimeout((function() {
              fs.stat(to, (function(stater, st) {
                if (stater && stater.code === 'ENOENT') fs$rename(from, to, CB); else cb(er);
              }));
            }), backoff);
            if (backoff < 100) backoff += 10;
            return;
          }
          if (cb) cb(er);
        }));
      }
      if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename);
      return rename;
    }(fs.rename);
  }
  fs.read = typeof fs.read !== 'function' ? fs.read : function(fs$read) {
    function read(fd, buffer, offset, length, position, callback_) {
      var callback;
      if (callback_ && typeof callback_ === 'function') {
        var eagCounter = 0;
        callback = function(er, _, __) {
          if (er && er.code === 'EAGAIN' && eagCounter < 10) {
            eagCounter++;
            return fs$read.call(fs, fd, buffer, offset, length, position, callback);
          }
          callback_.apply(this, arguments);
        };
      }
      return fs$read.call(fs, fd, buffer, offset, length, position, callback);
    }
    if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
    return read;
  }(fs.read);
  fs.readSync = typeof fs.readSync !== 'function' ? fs.readSync : function(fs$readSync) {
    return function(fd, buffer, offset, length, position) {
      var eagCounter = 0;
      while (true) {
        try {
          return fs$readSync.call(fs, fd, buffer, offset, length, position);
        } catch (er) {
          if (er.code === 'EAGAIN' && eagCounter < 10) {
            eagCounter++;
            continue;
          }
          throw er;
        }
      }
    };
  }(fs.readSync);
  function patchLchmod(fs) {
    fs.lchmod = function(path, mode, callback) {
      fs.open(path, constants$2.O_WRONLY | constants$2.O_SYMLINK, mode, (function(err, fd) {
        if (err) {
          if (callback) callback(err);
          return;
        }
        fs.fchmod(fd, mode, (function(err) {
          fs.close(fd, (function(err2) {
            if (callback) callback(err || err2);
          }));
        }));
      }));
    };
    fs.lchmodSync = function(path, mode) {
      var fd = fs.openSync(path, constants$2.O_WRONLY | constants$2.O_SYMLINK, mode);
      var threw = true;
      var ret;
      try {
        ret = fs.fchmodSync(fd, mode);
        threw = false;
      } finally {
        if (threw) {
          try {
            fs.closeSync(fd);
          } catch (er) {}
        } else {
          fs.closeSync(fd);
        }
      }
      return ret;
    };
  }
  function patchLutimes(fs) {
    if (constants$2.hasOwnProperty('O_SYMLINK') && fs.futimes) {
      fs.lutimes = function(path, at, mt, cb) {
        fs.open(path, constants$2.O_SYMLINK, (function(er, fd) {
          if (er) {
            if (cb) cb(er);
            return;
          }
          fs.futimes(fd, at, mt, (function(er) {
            fs.close(fd, (function(er2) {
              if (cb) cb(er || er2);
            }));
          }));
        }));
      };
      fs.lutimesSync = function(path, at, mt) {
        var fd = fs.openSync(path, constants$2.O_SYMLINK);
        var ret;
        var threw = true;
        try {
          ret = fs.futimesSync(fd, at, mt);
          threw = false;
        } finally {
          if (threw) {
            try {
              fs.closeSync(fd);
            } catch (er) {}
          } else {
            fs.closeSync(fd);
          }
        }
        return ret;
      };
    } else if (fs.futimes) {
      fs.lutimes = function(_a, _b, _c, cb) {
        if (cb) process.nextTick(cb);
      };
      fs.lutimesSync = function() {};
    }
  }
  function chmodFix(orig) {
    if (!orig) return orig;
    return function(target, mode, cb) {
      return orig.call(fs, target, mode, (function(er) {
        if (chownErOk(er)) er = null;
        if (cb) cb.apply(this, arguments);
      }));
    };
  }
  function chmodFixSync(orig) {
    if (!orig) return orig;
    return function(target, mode) {
      try {
        return orig.call(fs, target, mode);
      } catch (er) {
        if (!chownErOk(er)) throw er;
      }
    };
  }
  function chownFix(orig) {
    if (!orig) return orig;
    return function(target, uid, gid, cb) {
      return orig.call(fs, target, uid, gid, (function(er) {
        if (chownErOk(er)) er = null;
        if (cb) cb.apply(this, arguments);
      }));
    };
  }
  function chownFixSync(orig) {
    if (!orig) return orig;
    return function(target, uid, gid) {
      try {
        return orig.call(fs, target, uid, gid);
      } catch (er) {
        if (!chownErOk(er)) throw er;
      }
    };
  }
  function statFix(orig) {
    if (!orig) return orig;
    return function(target, options, cb) {
      if (typeof options === 'function') {
        cb = options;
        options = null;
      }
      function callback(er, stats) {
        if (stats) {
          if (stats.uid < 0) stats.uid += 4294967296;
          if (stats.gid < 0) stats.gid += 4294967296;
        }
        if (cb) cb.apply(this, arguments);
      }
      return options ? orig.call(fs, target, options, callback) : orig.call(fs, target, callback);
    };
  }
  function statFixSync(orig) {
    if (!orig) return orig;
    return function(target, options) {
      var stats = options ? orig.call(fs, target, options) : orig.call(fs, target);
      if (stats) {
        if (stats.uid < 0) stats.uid += 4294967296;
        if (stats.gid < 0) stats.gid += 4294967296;
      }
      return stats;
    };
  }
  function chownErOk(er) {
    if (!er) return true;
    if (er.code === 'ENOSYS') return true;
    var nonroot = !process.getuid || process.getuid() !== 0;
    if (nonroot) {
      if (er.code === 'EINVAL' || er.code === 'EPERM') return true;
    }
    return false;
  }
}

var Stream = require$$0$6.Stream;

var legacyStreams = legacy$1;

function legacy$1(fs) {
  return {
    ReadStream: ReadStream,
    WriteStream: WriteStream
  };
  function ReadStream(path, options) {
    if (!(this instanceof ReadStream)) return new ReadStream(path, options);
    Stream.call(this);
    var self = this;
    this.path = path;
    this.fd = null;
    this.readable = true;
    this.paused = false;
    this.flags = 'r';
    this.mode = 438;
    this.bufferSize = 64 * 1024;
    options = options || {};
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }
    if (this.encoding) this.setEncoding(this.encoding);
    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.end === undefined) {
        this.end = Infinity;
      } else if ('number' !== typeof this.end) {
        throw TypeError('end must be a Number');
      }
      if (this.start > this.end) {
        throw new Error('start must be <= end');
      }
      this.pos = this.start;
    }
    if (this.fd !== null) {
      process.nextTick((function() {
        self._read();
      }));
      return;
    }
    fs.open(this.path, this.flags, this.mode, (function(err, fd) {
      if (err) {
        self.emit('error', err);
        self.readable = false;
        return;
      }
      self.fd = fd;
      self.emit('open', fd);
      self._read();
    }));
  }
  function WriteStream(path, options) {
    if (!(this instanceof WriteStream)) return new WriteStream(path, options);
    Stream.call(this);
    this.path = path;
    this.fd = null;
    this.writable = true;
    this.flags = 'w';
    this.encoding = 'binary';
    this.mode = 438;
    this.bytesWritten = 0;
    options = options || {};
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }
    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.start < 0) {
        throw new Error('start must be >= zero');
      }
      this.pos = this.start;
    }
    this.busy = false;
    this._queue = [];
    if (this.fd === null) {
      this._open = fs.open;
      this._queue.push([ this._open, this.path, this.flags, this.mode, undefined ]);
      this.flush();
    }
  }
}

var clone_1 = clone$1;

var getPrototypeOf = Object.getPrototypeOf || function(obj) {
  return obj.__proto__;
};

function clone$1(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Object) var copy = {
    __proto__: getPrototypeOf(obj)
  }; else var copy = Object.create(null);
  Object.getOwnPropertyNames(obj).forEach((function(key) {
    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
  }));
  return copy;
}

var fs$h = require$$0$1;

var polyfills = polyfills$1;

var legacy = legacyStreams;

var clone = clone_1;

var util = require$$0$2;

var gracefulQueue;

var previousSymbol;

if (typeof Symbol === 'function' && typeof Symbol.for === 'function') {
  gracefulQueue = Symbol.for('graceful-fs.queue');
  previousSymbol = Symbol.for('graceful-fs.previous');
} else {
  gracefulQueue = '___graceful-fs.queue';
  previousSymbol = '___graceful-fs.previous';
}

function noop() {}

function publishQueue(context, queue) {
  Object.defineProperty(context, gracefulQueue, {
    get: function() {
      return queue;
    }
  });
}

var debug$2 = noop;

if (util.debuglog) debug$2 = util.debuglog('gfs4'); else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) debug$2 = function() {
  var m = util.format.apply(util, arguments);
  m = 'GFS4: ' + m.split(/\n/).join('\nGFS4: ');
  console.error(m);
};

if (!fs$h[gracefulQueue]) {
  var queue = commonjsGlobal[gracefulQueue] || [];
  publishQueue(fs$h, queue);
  fs$h.close = function(fs$close) {
    function close(fd, cb) {
      return fs$close.call(fs$h, fd, (function(err) {
        if (!err) {
          resetQueue();
        }
        if (typeof cb === 'function') cb.apply(this, arguments);
      }));
    }
    Object.defineProperty(close, previousSymbol, {
      value: fs$close
    });
    return close;
  }(fs$h.close);
  fs$h.closeSync = function(fs$closeSync) {
    function closeSync(fd) {
      fs$closeSync.apply(fs$h, arguments);
      resetQueue();
    }
    Object.defineProperty(closeSync, previousSymbol, {
      value: fs$closeSync
    });
    return closeSync;
  }(fs$h.closeSync);
  if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
    process.on('exit', (function() {
      debug$2(fs$h[gracefulQueue]);
      require$$5.equal(fs$h[gracefulQueue].length, 0);
    }));
  }
}

if (!commonjsGlobal[gracefulQueue]) {
  publishQueue(commonjsGlobal, fs$h[gracefulQueue]);
}

var gracefulFs = patch$2(clone(fs$h));

if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs$h.__patched) {
  gracefulFs = patch$2(fs$h);
  fs$h.__patched = true;
}

function patch$2(fs) {
  polyfills(fs);
  fs.gracefulify = patch$2;
  fs.createReadStream = createReadStream;
  fs.createWriteStream = createWriteStream;
  var fs$readFile = fs.readFile;
  fs.readFile = readFile;
  function readFile(path, options, cb) {
    if (typeof options === 'function') cb = options, options = null;
    return go$readFile(path, options, cb);
    function go$readFile(path, options, cb, startTime) {
      return fs$readFile(path, options, (function(err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([ go$readFile, [ path, options, cb ], err, startTime || Date.now(), Date.now() ]); else {
          if (typeof cb === 'function') cb.apply(this, arguments);
        }
      }));
    }
  }
  var fs$writeFile = fs.writeFile;
  fs.writeFile = writeFile;
  function writeFile(path, data, options, cb) {
    if (typeof options === 'function') cb = options, options = null;
    return go$writeFile(path, data, options, cb);
    function go$writeFile(path, data, options, cb, startTime) {
      return fs$writeFile(path, data, options, (function(err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([ go$writeFile, [ path, data, options, cb ], err, startTime || Date.now(), Date.now() ]); else {
          if (typeof cb === 'function') cb.apply(this, arguments);
        }
      }));
    }
  }
  var fs$appendFile = fs.appendFile;
  if (fs$appendFile) fs.appendFile = appendFile;
  function appendFile(path, data, options, cb) {
    if (typeof options === 'function') cb = options, options = null;
    return go$appendFile(path, data, options, cb);
    function go$appendFile(path, data, options, cb, startTime) {
      return fs$appendFile(path, data, options, (function(err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([ go$appendFile, [ path, data, options, cb ], err, startTime || Date.now(), Date.now() ]); else {
          if (typeof cb === 'function') cb.apply(this, arguments);
        }
      }));
    }
  }
  var fs$copyFile = fs.copyFile;
  if (fs$copyFile) fs.copyFile = copyFile;
  function copyFile(src, dest, flags, cb) {
    if (typeof flags === 'function') {
      cb = flags;
      flags = 0;
    }
    return go$copyFile(src, dest, flags, cb);
    function go$copyFile(src, dest, flags, cb, startTime) {
      return fs$copyFile(src, dest, flags, (function(err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([ go$copyFile, [ src, dest, flags, cb ], err, startTime || Date.now(), Date.now() ]); else {
          if (typeof cb === 'function') cb.apply(this, arguments);
        }
      }));
    }
  }
  var fs$readdir = fs.readdir;
  fs.readdir = readdir;
  var noReaddirOptionVersions = /^v[0-5]\./;
  function readdir(path, options, cb) {
    if (typeof options === 'function') cb = options, options = null;
    var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir(path, options, cb, startTime) {
      return fs$readdir(path, fs$readdirCallback(path, options, cb, startTime));
    } : function go$readdir(path, options, cb, startTime) {
      return fs$readdir(path, options, fs$readdirCallback(path, options, cb, startTime));
    };
    return go$readdir(path, options, cb);
    function fs$readdirCallback(path, options, cb, startTime) {
      return function(err, files) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([ go$readdir, [ path, options, cb ], err, startTime || Date.now(), Date.now() ]); else {
          if (files && files.sort) files.sort();
          if (typeof cb === 'function') cb.call(this, err, files);
        }
      };
    }
  }
  if (process.version.substr(0, 4) === 'v0.8') {
    var legStreams = legacy(fs);
    ReadStream = legStreams.ReadStream;
    WriteStream = legStreams.WriteStream;
  }
  var fs$ReadStream = fs.ReadStream;
  if (fs$ReadStream) {
    ReadStream.prototype = Object.create(fs$ReadStream.prototype);
    ReadStream.prototype.open = ReadStream$open;
  }
  var fs$WriteStream = fs.WriteStream;
  if (fs$WriteStream) {
    WriteStream.prototype = Object.create(fs$WriteStream.prototype);
    WriteStream.prototype.open = WriteStream$open;
  }
  Object.defineProperty(fs, 'ReadStream', {
    get: function() {
      return ReadStream;
    },
    set: function(val) {
      ReadStream = val;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(fs, 'WriteStream', {
    get: function() {
      return WriteStream;
    },
    set: function(val) {
      WriteStream = val;
    },
    enumerable: true,
    configurable: true
  });
  var FileReadStream = ReadStream;
  Object.defineProperty(fs, 'FileReadStream', {
    get: function() {
      return FileReadStream;
    },
    set: function(val) {
      FileReadStream = val;
    },
    enumerable: true,
    configurable: true
  });
  var FileWriteStream = WriteStream;
  Object.defineProperty(fs, 'FileWriteStream', {
    get: function() {
      return FileWriteStream;
    },
    set: function(val) {
      FileWriteStream = val;
    },
    enumerable: true,
    configurable: true
  });
  function ReadStream(path, options) {
    if (this instanceof ReadStream) return fs$ReadStream.apply(this, arguments), this; else return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
  }
  function ReadStream$open() {
    var that = this;
    open(that.path, that.flags, that.mode, (function(err, fd) {
      if (err) {
        if (that.autoClose) that.destroy();
        that.emit('error', err);
      } else {
        that.fd = fd;
        that.emit('open', fd);
        that.read();
      }
    }));
  }
  function WriteStream(path, options) {
    if (this instanceof WriteStream) return fs$WriteStream.apply(this, arguments), this; else return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
  }
  function WriteStream$open() {
    var that = this;
    open(that.path, that.flags, that.mode, (function(err, fd) {
      if (err) {
        that.destroy();
        that.emit('error', err);
      } else {
        that.fd = fd;
        that.emit('open', fd);
      }
    }));
  }
  function createReadStream(path, options) {
    return new fs.ReadStream(path, options);
  }
  function createWriteStream(path, options) {
    return new fs.WriteStream(path, options);
  }
  var fs$open = fs.open;
  fs.open = open;
  function open(path, flags, mode, cb) {
    if (typeof mode === 'function') cb = mode, mode = null;
    return go$open(path, flags, mode, cb);
    function go$open(path, flags, mode, cb, startTime) {
      return fs$open(path, flags, mode, (function(err, fd) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([ go$open, [ path, flags, mode, cb ], err, startTime || Date.now(), Date.now() ]); else {
          if (typeof cb === 'function') cb.apply(this, arguments);
        }
      }));
    }
  }
  return fs;
}

function enqueue(elem) {
  debug$2('ENQUEUE', elem[0].name, elem[1]);
  fs$h[gracefulQueue].push(elem);
  retry();
}

var retryTimer;

function resetQueue() {
  var now = Date.now();
  for (var i = 0; i < fs$h[gracefulQueue].length; ++i) {
    if (fs$h[gracefulQueue][i].length > 2) {
      fs$h[gracefulQueue][i][3] = now;
      fs$h[gracefulQueue][i][4] = now;
    }
  }
  retry();
}

function retry() {
  clearTimeout(retryTimer);
  retryTimer = undefined;
  if (fs$h[gracefulQueue].length === 0) return;
  var elem = fs$h[gracefulQueue].shift();
  var fn = elem[0];
  var args = elem[1];
  var err = elem[2];
  var startTime = elem[3];
  var lastTime = elem[4];
  if (startTime === undefined) {
    debug$2('RETRY', fn.name, args);
    fn.apply(null, args);
  } else if (Date.now() - startTime >= 6e4) {
    debug$2('TIMEOUT', fn.name, args);
    var cb = args.pop();
    if (typeof cb === 'function') cb.call(null, err);
  } else {
    var sinceAttempt = Date.now() - lastTime;
    var sinceStart = Math.max(lastTime - startTime, 1);
    var desiredDelay = Math.min(sinceStart * 1.2, 100);
    if (sinceAttempt >= desiredDelay) {
      debug$2('RETRY', fn.name, args);
      fn.apply(null, args.concat([ startTime ]));
    } else {
      fs$h[gracefulQueue].push(elem);
    }
  }
  if (retryTimer === undefined) {
    retryTimer = setTimeout(retry, 0);
  }
}

(function(exports) {
  const u = universalify$1.fromCallback;
  const fs = gracefulFs;
  const api = [ 'access', 'appendFile', 'chmod', 'chown', 'close', 'copyFile', 'fchmod', 'fchown', 'fdatasync', 'fstat', 'fsync', 'ftruncate', 'futimes', 'lchmod', 'lchown', 'link', 'lstat', 'mkdir', 'mkdtemp', 'open', 'opendir', 'readdir', 'readFile', 'readlink', 'realpath', 'rename', 'rm', 'rmdir', 'stat', 'symlink', 'truncate', 'unlink', 'utimes', 'writeFile' ].filter((key => typeof fs[key] === 'function'));
  Object.assign(exports, fs);
  api.forEach((method => {
    exports[method] = u(fs[method]);
  }));
  exports.exists = function(filename, callback) {
    if (typeof callback === 'function') {
      return fs.exists(filename, callback);
    }
    return new Promise((resolve => fs.exists(filename, resolve)));
  };
  exports.read = function(fd, buffer, offset, length, position, callback) {
    if (typeof callback === 'function') {
      return fs.read(fd, buffer, offset, length, position, callback);
    }
    return new Promise(((resolve, reject) => {
      fs.read(fd, buffer, offset, length, position, ((err, bytesRead, buffer) => {
        if (err) return reject(err);
        resolve({
          bytesRead: bytesRead,
          buffer: buffer
        });
      }));
    }));
  };
  exports.write = function(fd, buffer, ...args) {
    if (typeof args[args.length - 1] === 'function') {
      return fs.write(fd, buffer, ...args);
    }
    return new Promise(((resolve, reject) => {
      fs.write(fd, buffer, ...args, ((err, bytesWritten, buffer) => {
        if (err) return reject(err);
        resolve({
          bytesWritten: bytesWritten,
          buffer: buffer
        });
      }));
    }));
  };
  exports.readv = function(fd, buffers, ...args) {
    if (typeof args[args.length - 1] === 'function') {
      return fs.readv(fd, buffers, ...args);
    }
    return new Promise(((resolve, reject) => {
      fs.readv(fd, buffers, ...args, ((err, bytesRead, buffers) => {
        if (err) return reject(err);
        resolve({
          bytesRead: bytesRead,
          buffers: buffers
        });
      }));
    }));
  };
  exports.writev = function(fd, buffers, ...args) {
    if (typeof args[args.length - 1] === 'function') {
      return fs.writev(fd, buffers, ...args);
    }
    return new Promise(((resolve, reject) => {
      fs.writev(fd, buffers, ...args, ((err, bytesWritten, buffers) => {
        if (err) return reject(err);
        resolve({
          bytesWritten: bytesWritten,
          buffers: buffers
        });
      }));
    }));
  };
  if (typeof fs.realpath.native === 'function') {
    exports.realpath.native = u(fs.realpath.native);
  } else {
    process.emitWarning('fs.realpath.native is not a function. Is fs being monkey-patched?', 'Warning', 'fs-extra-WARN0003');
  }
})(fs$i);

var makeDir$1 = {};

var utils$1 = {};

const path$b = require$$1$1;

utils$1.checkPath = function checkPath(pth) {
  if (process.platform === 'win32') {
    const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path$b.parse(pth).root, ''));
    if (pathHasInvalidWinCharacters) {
      const error = new Error(`Path contains invalid characters: ${pth}`);
      error.code = 'EINVAL';
      throw error;
    }
  }
};

const fs$g = fs$i;

const {checkPath: checkPath} = utils$1;

const getMode = options => {
  const defaults = {
    mode: 511
  };
  if (typeof options === 'number') return options;
  return {
    ...defaults,
    ...options
  }.mode;
};

makeDir$1.makeDir = async (dir, options) => {
  checkPath(dir);
  return fs$g.mkdir(dir, {
    mode: getMode(options),
    recursive: true
  });
};

makeDir$1.makeDirSync = (dir, options) => {
  checkPath(dir);
  return fs$g.mkdirSync(dir, {
    mode: getMode(options),
    recursive: true
  });
};

const u$e = universalify$1.fromPromise;

const {makeDir: _makeDir, makeDirSync: makeDirSync} = makeDir$1;

const makeDir = u$e(_makeDir);

var mkdirs$2 = {
  mkdirs: makeDir,
  mkdirsSync: makeDirSync,
  mkdirp: makeDir,
  mkdirpSync: makeDirSync,
  ensureDir: makeDir,
  ensureDirSync: makeDirSync
};

const u$d = universalify$1.fromPromise;

const fs$f = fs$i;

function pathExists$6(path) {
  return fs$f.access(path).then((() => true)).catch((() => false));
}

var pathExists_1 = {
  pathExists: u$d(pathExists$6),
  pathExistsSync: fs$f.existsSync
};

const fs$e = fs$i;

const u$c = universalify$1.fromPromise;

async function utimesMillis$1(path, atime, mtime) {
  const fd = await fs$e.open(path, 'r+');
  let closeErr = null;
  try {
    await fs$e.futimes(fd, atime, mtime);
  } finally {
    try {
      await fs$e.close(fd);
    } catch (e) {
      closeErr = e;
    }
  }
  if (closeErr) {
    throw closeErr;
  }
}

function utimesMillisSync$1(path, atime, mtime) {
  const fd = fs$e.openSync(path, 'r+');
  fs$e.futimesSync(fd, atime, mtime);
  return fs$e.closeSync(fd);
}

var utimes = {
  utimesMillis: u$c(utimesMillis$1),
  utimesMillisSync: utimesMillisSync$1
};

const fs$d = fs$i;

const path$a = require$$1$1;

const u$b = universalify$1.fromPromise;

function getStats$1(src, dest, opts) {
  const statFunc = opts.dereference ? file => fs$d.stat(file, {
    bigint: true
  }) : file => fs$d.lstat(file, {
    bigint: true
  });
  return Promise.all([ statFunc(src), statFunc(dest).catch((err => {
    if (err.code === 'ENOENT') return null;
    throw err;
  })) ]).then((([srcStat, destStat]) => ({
    srcStat: srcStat,
    destStat: destStat
  })));
}

function getStatsSync(src, dest, opts) {
  let destStat;
  const statFunc = opts.dereference ? file => fs$d.statSync(file, {
    bigint: true
  }) : file => fs$d.lstatSync(file, {
    bigint: true
  });
  const srcStat = statFunc(src);
  try {
    destStat = statFunc(dest);
  } catch (err) {
    if (err.code === 'ENOENT') return {
      srcStat: srcStat,
      destStat: null
    };
    throw err;
  }
  return {
    srcStat: srcStat,
    destStat: destStat
  };
}

async function checkPaths(src, dest, funcName, opts) {
  const {srcStat: srcStat, destStat: destStat} = await getStats$1(src, dest, opts);
  if (destStat) {
    if (areIdentical$2(srcStat, destStat)) {
      const srcBaseName = path$a.basename(src);
      const destBaseName = path$a.basename(dest);
      if (funcName === 'move' && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
        return {
          srcStat: srcStat,
          destStat: destStat,
          isChangingCase: true
        };
      }
      throw new Error('Source and destination must not be the same.');
    }
    if (srcStat.isDirectory() && !destStat.isDirectory()) {
      throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
    }
    if (!srcStat.isDirectory() && destStat.isDirectory()) {
      throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
    }
  }
  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new Error(errMsg(src, dest, funcName));
  }
  return {
    srcStat: srcStat,
    destStat: destStat
  };
}

function checkPathsSync(src, dest, funcName, opts) {
  const {srcStat: srcStat, destStat: destStat} = getStatsSync(src, dest, opts);
  if (destStat) {
    if (areIdentical$2(srcStat, destStat)) {
      const srcBaseName = path$a.basename(src);
      const destBaseName = path$a.basename(dest);
      if (funcName === 'move' && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
        return {
          srcStat: srcStat,
          destStat: destStat,
          isChangingCase: true
        };
      }
      throw new Error('Source and destination must not be the same.');
    }
    if (srcStat.isDirectory() && !destStat.isDirectory()) {
      throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
    }
    if (!srcStat.isDirectory() && destStat.isDirectory()) {
      throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
    }
  }
  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new Error(errMsg(src, dest, funcName));
  }
  return {
    srcStat: srcStat,
    destStat: destStat
  };
}

async function checkParentPaths(src, srcStat, dest, funcName) {
  const srcParent = path$a.resolve(path$a.dirname(src));
  const destParent = path$a.resolve(path$a.dirname(dest));
  if (destParent === srcParent || destParent === path$a.parse(destParent).root) return;
  let destStat;
  try {
    destStat = await fs$d.stat(destParent, {
      bigint: true
    });
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
  if (areIdentical$2(srcStat, destStat)) {
    throw new Error(errMsg(src, dest, funcName));
  }
  return checkParentPaths(src, srcStat, destParent, funcName);
}

function checkParentPathsSync(src, srcStat, dest, funcName) {
  const srcParent = path$a.resolve(path$a.dirname(src));
  const destParent = path$a.resolve(path$a.dirname(dest));
  if (destParent === srcParent || destParent === path$a.parse(destParent).root) return;
  let destStat;
  try {
    destStat = fs$d.statSync(destParent, {
      bigint: true
    });
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
  if (areIdentical$2(srcStat, destStat)) {
    throw new Error(errMsg(src, dest, funcName));
  }
  return checkParentPathsSync(src, srcStat, destParent, funcName);
}

function areIdentical$2(srcStat, destStat) {
  return destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev;
}

function isSrcSubdir(src, dest) {
  const srcArr = path$a.resolve(src).split(path$a.sep).filter((i => i));
  const destArr = path$a.resolve(dest).split(path$a.sep).filter((i => i));
  return srcArr.every(((cur, i) => destArr[i] === cur));
}

function errMsg(src, dest, funcName) {
  return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
}

var stat$4 = {
  checkPaths: u$b(checkPaths),
  checkPathsSync: checkPathsSync,
  checkParentPaths: u$b(checkParentPaths),
  checkParentPathsSync: checkParentPathsSync,
  isSrcSubdir: isSrcSubdir,
  areIdentical: areIdentical$2
};

const fs$c = fs$i;

const path$9 = require$$1$1;

const {mkdirs: mkdirs$1} = mkdirs$2;

const {pathExists: pathExists$5} = pathExists_1;

const {utimesMillis: utimesMillis} = utimes;

const stat$3 = stat$4;

async function copy$2(src, dest, opts = {}) {
  if (typeof opts === 'function') {
    opts = {
      filter: opts
    };
  }
  opts.clobber = 'clobber' in opts ? !!opts.clobber : true;
  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber;
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    process.emitWarning('Using the preserveTimestamps option in 32-bit node is not recommended;\n\n' + '\tsee https://github.com/jprichardson/node-fs-extra/issues/269', 'Warning', 'fs-extra-WARN0001');
  }
  const {srcStat: srcStat, destStat: destStat} = await stat$3.checkPaths(src, dest, 'copy', opts);
  await stat$3.checkParentPaths(src, srcStat, dest, 'copy');
  const include = await runFilter(src, dest, opts);
  if (!include) return;
  const destParent = path$9.dirname(dest);
  const dirExists = await pathExists$5(destParent);
  if (!dirExists) {
    await mkdirs$1(destParent);
  }
  await getStatsAndPerformCopy(destStat, src, dest, opts);
}

async function runFilter(src, dest, opts) {
  if (!opts.filter) return true;
  return opts.filter(src, dest);
}

async function getStatsAndPerformCopy(destStat, src, dest, opts) {
  const statFn = opts.dereference ? fs$c.stat : fs$c.lstat;
  const srcStat = await statFn(src);
  if (srcStat.isDirectory()) return onDir$1(srcStat, destStat, src, dest, opts);
  if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile$1(srcStat, destStat, src, dest, opts);
  if (srcStat.isSymbolicLink()) return onLink$1(destStat, src, dest, opts);
  if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`);
  if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
  throw new Error(`Unknown file: ${src}`);
}

async function onFile$1(srcStat, destStat, src, dest, opts) {
  if (!destStat) return copyFile$1(srcStat, src, dest, opts);
  if (opts.overwrite) {
    await fs$c.unlink(dest);
    return copyFile$1(srcStat, src, dest, opts);
  }
  if (opts.errorOnExist) {
    throw new Error(`'${dest}' already exists`);
  }
}

async function copyFile$1(srcStat, src, dest, opts) {
  await fs$c.copyFile(src, dest);
  if (opts.preserveTimestamps) {
    if (fileIsNotWritable$1(srcStat.mode)) {
      await makeFileWritable$1(dest, srcStat.mode);
    }
    const updatedSrcStat = await fs$c.stat(src);
    await utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
  }
  return fs$c.chmod(dest, srcStat.mode);
}

function fileIsNotWritable$1(srcMode) {
  return (srcMode & 128) === 0;
}

function makeFileWritable$1(dest, srcMode) {
  return fs$c.chmod(dest, srcMode | 128);
}

async function onDir$1(srcStat, destStat, src, dest, opts) {
  if (!destStat) {
    await fs$c.mkdir(dest);
  }
  const items = await fs$c.readdir(src);
  await Promise.all(items.map((async item => {
    const srcItem = path$9.join(src, item);
    const destItem = path$9.join(dest, item);
    const include = await runFilter(srcItem, destItem, opts);
    if (!include) return;
    const {destStat: destStat} = await stat$3.checkPaths(srcItem, destItem, 'copy', opts);
    return getStatsAndPerformCopy(destStat, srcItem, destItem, opts);
  })));
  if (!destStat) {
    await fs$c.chmod(dest, srcStat.mode);
  }
}

async function onLink$1(destStat, src, dest, opts) {
  let resolvedSrc = await fs$c.readlink(src);
  if (opts.dereference) {
    resolvedSrc = path$9.resolve(process.cwd(), resolvedSrc);
  }
  if (!destStat) {
    return fs$c.symlink(resolvedSrc, dest);
  }
  let resolvedDest = null;
  try {
    resolvedDest = await fs$c.readlink(dest);
  } catch (e) {
    if (e.code === 'EINVAL' || e.code === 'UNKNOWN') return fs$c.symlink(resolvedSrc, dest);
    throw e;
  }
  if (opts.dereference) {
    resolvedDest = path$9.resolve(process.cwd(), resolvedDest);
  }
  if (stat$3.isSrcSubdir(resolvedSrc, resolvedDest)) {
    throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
  }
  if (stat$3.isSrcSubdir(resolvedDest, resolvedSrc)) {
    throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
  }
  await fs$c.unlink(dest);
  return fs$c.symlink(resolvedSrc, dest);
}

var copy_1 = copy$2;

const fs$b = gracefulFs;

const path$8 = require$$1$1;

const mkdirsSync$1 = mkdirs$2.mkdirsSync;

const utimesMillisSync = utimes.utimesMillisSync;

const stat$2 = stat$4;

function copySync$1(src, dest, opts) {
  if (typeof opts === 'function') {
    opts = {
      filter: opts
    };
  }
  opts = opts || {};
  opts.clobber = 'clobber' in opts ? !!opts.clobber : true;
  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber;
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    process.emitWarning('Using the preserveTimestamps option in 32-bit node is not recommended;\n\n' + '\tsee https://github.com/jprichardson/node-fs-extra/issues/269', 'Warning', 'fs-extra-WARN0002');
  }
  const {srcStat: srcStat, destStat: destStat} = stat$2.checkPathsSync(src, dest, 'copy', opts);
  stat$2.checkParentPathsSync(src, srcStat, dest, 'copy');
  if (opts.filter && !opts.filter(src, dest)) return;
  const destParent = path$8.dirname(dest);
  if (!fs$b.existsSync(destParent)) mkdirsSync$1(destParent);
  return getStats(destStat, src, dest, opts);
}

function getStats(destStat, src, dest, opts) {
  const statSync = opts.dereference ? fs$b.statSync : fs$b.lstatSync;
  const srcStat = statSync(src);
  if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts); else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts); else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts); else if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`); else if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
  throw new Error(`Unknown file: ${src}`);
}

function onFile(srcStat, destStat, src, dest, opts) {
  if (!destStat) return copyFile(srcStat, src, dest, opts);
  return mayCopyFile(srcStat, src, dest, opts);
}

function mayCopyFile(srcStat, src, dest, opts) {
  if (opts.overwrite) {
    fs$b.unlinkSync(dest);
    return copyFile(srcStat, src, dest, opts);
  } else if (opts.errorOnExist) {
    throw new Error(`'${dest}' already exists`);
  }
}

function copyFile(srcStat, src, dest, opts) {
  fs$b.copyFileSync(src, dest);
  if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest);
  return setDestMode(dest, srcStat.mode);
}

function handleTimestamps(srcMode, src, dest) {
  if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode);
  return setDestTimestamps(src, dest);
}

function fileIsNotWritable(srcMode) {
  return (srcMode & 128) === 0;
}

function makeFileWritable(dest, srcMode) {
  return setDestMode(dest, srcMode | 128);
}

function setDestMode(dest, srcMode) {
  return fs$b.chmodSync(dest, srcMode);
}

function setDestTimestamps(src, dest) {
  const updatedSrcStat = fs$b.statSync(src);
  return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
}

function onDir(srcStat, destStat, src, dest, opts) {
  if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts);
  return copyDir(src, dest, opts);
}

function mkDirAndCopy(srcMode, src, dest, opts) {
  fs$b.mkdirSync(dest);
  copyDir(src, dest, opts);
  return setDestMode(dest, srcMode);
}

function copyDir(src, dest, opts) {
  fs$b.readdirSync(src).forEach((item => copyDirItem(item, src, dest, opts)));
}

function copyDirItem(item, src, dest, opts) {
  const srcItem = path$8.join(src, item);
  const destItem = path$8.join(dest, item);
  if (opts.filter && !opts.filter(srcItem, destItem)) return;
  const {destStat: destStat} = stat$2.checkPathsSync(srcItem, destItem, 'copy', opts);
  return getStats(destStat, srcItem, destItem, opts);
}

function onLink(destStat, src, dest, opts) {
  let resolvedSrc = fs$b.readlinkSync(src);
  if (opts.dereference) {
    resolvedSrc = path$8.resolve(process.cwd(), resolvedSrc);
  }
  if (!destStat) {
    return fs$b.symlinkSync(resolvedSrc, dest);
  } else {
    let resolvedDest;
    try {
      resolvedDest = fs$b.readlinkSync(dest);
    } catch (err) {
      if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return fs$b.symlinkSync(resolvedSrc, dest);
      throw err;
    }
    if (opts.dereference) {
      resolvedDest = path$8.resolve(process.cwd(), resolvedDest);
    }
    if (stat$2.isSrcSubdir(resolvedSrc, resolvedDest)) {
      throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
    }
    if (stat$2.isSrcSubdir(resolvedDest, resolvedSrc)) {
      throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
    }
    return copyLink(resolvedSrc, dest);
  }
}

function copyLink(resolvedSrc, dest) {
  fs$b.unlinkSync(dest);
  return fs$b.symlinkSync(resolvedSrc, dest);
}

var copySync_1 = copySync$1;

const u$a = universalify$1.fromPromise;

var copy$1 = {
  copy: u$a(copy_1),
  copySync: copySync_1
};

const fs$a = gracefulFs;

const u$9 = universalify$1.fromCallback;

function remove$2(path, callback) {
  fs$a.rm(path, {
    recursive: true,
    force: true
  }, callback);
}

function removeSync$1(path) {
  fs$a.rmSync(path, {
    recursive: true,
    force: true
  });
}

var remove_1 = {
  remove: u$9(remove$2),
  removeSync: removeSync$1
};

const u$8 = universalify$1.fromPromise;

const fs$9 = fs$i;

const path$7 = require$$1$1;

const mkdir$3 = mkdirs$2;

const remove$1 = remove_1;

const emptyDir = u$8((async function emptyDir(dir) {
  let items;
  try {
    items = await fs$9.readdir(dir);
  } catch {
    return mkdir$3.mkdirs(dir);
  }
  return Promise.all(items.map((item => remove$1.remove(path$7.join(dir, item)))));
}));

function emptyDirSync(dir) {
  let items;
  try {
    items = fs$9.readdirSync(dir);
  } catch {
    return mkdir$3.mkdirsSync(dir);
  }
  items.forEach((item => {
    item = path$7.join(dir, item);
    remove$1.removeSync(item);
  }));
}

var empty = {
  emptyDirSync: emptyDirSync,
  emptydirSync: emptyDirSync,
  emptyDir: emptyDir,
  emptydir: emptyDir
};

const u$7 = universalify$1.fromPromise;

const path$6 = require$$1$1;

const fs$8 = fs$i;

const mkdir$2 = mkdirs$2;

async function createFile$1(file) {
  let stats;
  try {
    stats = await fs$8.stat(file);
  } catch {}
  if (stats && stats.isFile()) return;
  const dir = path$6.dirname(file);
  let dirStats = null;
  try {
    dirStats = await fs$8.stat(dir);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await mkdir$2.mkdirs(dir);
      await fs$8.writeFile(file, '');
      return;
    } else {
      throw err;
    }
  }
  if (dirStats.isDirectory()) {
    await fs$8.writeFile(file, '');
  } else {
    await fs$8.readdir(dir);
  }
}

function createFileSync$1(file) {
  let stats;
  try {
    stats = fs$8.statSync(file);
  } catch {}
  if (stats && stats.isFile()) return;
  const dir = path$6.dirname(file);
  try {
    if (!fs$8.statSync(dir).isDirectory()) {
      fs$8.readdirSync(dir);
    }
  } catch (err) {
    if (err && err.code === 'ENOENT') mkdir$2.mkdirsSync(dir); else throw err;
  }
  fs$8.writeFileSync(file, '');
}

var file$1 = {
  createFile: u$7(createFile$1),
  createFileSync: createFileSync$1
};

const u$6 = universalify$1.fromPromise;

const path$5 = require$$1$1;

const fs$7 = fs$i;

const mkdir$1 = mkdirs$2;

const {pathExists: pathExists$4} = pathExists_1;

const {areIdentical: areIdentical$1} = stat$4;

async function createLink$1(srcpath, dstpath) {
  let dstStat;
  try {
    dstStat = await fs$7.lstat(dstpath);
  } catch {}
  let srcStat;
  try {
    srcStat = await fs$7.lstat(srcpath);
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureLink');
    throw err;
  }
  if (dstStat && areIdentical$1(srcStat, dstStat)) return;
  const dir = path$5.dirname(dstpath);
  const dirExists = await pathExists$4(dir);
  if (!dirExists) {
    await mkdir$1.mkdirs(dir);
  }
  await fs$7.link(srcpath, dstpath);
}

function createLinkSync$1(srcpath, dstpath) {
  let dstStat;
  try {
    dstStat = fs$7.lstatSync(dstpath);
  } catch {}
  try {
    const srcStat = fs$7.lstatSync(srcpath);
    if (dstStat && areIdentical$1(srcStat, dstStat)) return;
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureLink');
    throw err;
  }
  const dir = path$5.dirname(dstpath);
  const dirExists = fs$7.existsSync(dir);
  if (dirExists) return fs$7.linkSync(srcpath, dstpath);
  mkdir$1.mkdirsSync(dir);
  return fs$7.linkSync(srcpath, dstpath);
}

var link = {
  createLink: u$6(createLink$1),
  createLinkSync: createLinkSync$1
};

const path$4 = require$$1$1;

const fs$6 = fs$i;

const {pathExists: pathExists$3} = pathExists_1;

const u$5 = universalify$1.fromPromise;

async function symlinkPaths$1(srcpath, dstpath) {
  if (path$4.isAbsolute(srcpath)) {
    try {
      await fs$6.lstat(srcpath);
    } catch (err) {
      err.message = err.message.replace('lstat', 'ensureSymlink');
      throw err;
    }
    return {
      toCwd: srcpath,
      toDst: srcpath
    };
  }
  const dstdir = path$4.dirname(dstpath);
  const relativeToDst = path$4.join(dstdir, srcpath);
  const exists = await pathExists$3(relativeToDst);
  if (exists) {
    return {
      toCwd: relativeToDst,
      toDst: srcpath
    };
  }
  try {
    await fs$6.lstat(srcpath);
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureSymlink');
    throw err;
  }
  return {
    toCwd: srcpath,
    toDst: path$4.relative(dstdir, srcpath)
  };
}

function symlinkPathsSync$1(srcpath, dstpath) {
  if (path$4.isAbsolute(srcpath)) {
    const exists = fs$6.existsSync(srcpath);
    if (!exists) throw new Error('absolute srcpath does not exist');
    return {
      toCwd: srcpath,
      toDst: srcpath
    };
  }
  const dstdir = path$4.dirname(dstpath);
  const relativeToDst = path$4.join(dstdir, srcpath);
  const exists = fs$6.existsSync(relativeToDst);
  if (exists) {
    return {
      toCwd: relativeToDst,
      toDst: srcpath
    };
  }
  const srcExists = fs$6.existsSync(srcpath);
  if (!srcExists) throw new Error('relative srcpath does not exist');
  return {
    toCwd: srcpath,
    toDst: path$4.relative(dstdir, srcpath)
  };
}

var symlinkPaths_1 = {
  symlinkPaths: u$5(symlinkPaths$1),
  symlinkPathsSync: symlinkPathsSync$1
};

const fs$5 = fs$i;

const u$4 = universalify$1.fromPromise;

async function symlinkType$1(srcpath, type) {
  if (type) return type;
  let stats;
  try {
    stats = await fs$5.lstat(srcpath);
  } catch {
    return 'file';
  }
  return stats && stats.isDirectory() ? 'dir' : 'file';
}

function symlinkTypeSync$1(srcpath, type) {
  if (type) return type;
  let stats;
  try {
    stats = fs$5.lstatSync(srcpath);
  } catch {
    return 'file';
  }
  return stats && stats.isDirectory() ? 'dir' : 'file';
}

var symlinkType_1 = {
  symlinkType: u$4(symlinkType$1),
  symlinkTypeSync: symlinkTypeSync$1
};

const u$3 = universalify$1.fromPromise;

const path$3 = require$$1$1;

const fs$4 = fs$i;

const {mkdirs: mkdirs, mkdirsSync: mkdirsSync} = mkdirs$2;

const {symlinkPaths: symlinkPaths, symlinkPathsSync: symlinkPathsSync} = symlinkPaths_1;

const {symlinkType: symlinkType, symlinkTypeSync: symlinkTypeSync} = symlinkType_1;

const {pathExists: pathExists$2} = pathExists_1;

const {areIdentical: areIdentical} = stat$4;

async function createSymlink$1(srcpath, dstpath, type) {
  let stats;
  try {
    stats = await fs$4.lstat(dstpath);
  } catch {}
  if (stats && stats.isSymbolicLink()) {
    const [srcStat, dstStat] = await Promise.all([ fs$4.stat(srcpath), fs$4.stat(dstpath) ]);
    if (areIdentical(srcStat, dstStat)) return;
  }
  const relative = await symlinkPaths(srcpath, dstpath);
  srcpath = relative.toDst;
  const toType = await symlinkType(relative.toCwd, type);
  const dir = path$3.dirname(dstpath);
  if (!await pathExists$2(dir)) {
    await mkdirs(dir);
  }
  return fs$4.symlink(srcpath, dstpath, toType);
}

function createSymlinkSync$1(srcpath, dstpath, type) {
  let stats;
  try {
    stats = fs$4.lstatSync(dstpath);
  } catch {}
  if (stats && stats.isSymbolicLink()) {
    const srcStat = fs$4.statSync(srcpath);
    const dstStat = fs$4.statSync(dstpath);
    if (areIdentical(srcStat, dstStat)) return;
  }
  const relative = symlinkPathsSync(srcpath, dstpath);
  srcpath = relative.toDst;
  type = symlinkTypeSync(relative.toCwd, type);
  const dir = path$3.dirname(dstpath);
  const exists = fs$4.existsSync(dir);
  if (exists) return fs$4.symlinkSync(srcpath, dstpath, type);
  mkdirsSync(dir);
  return fs$4.symlinkSync(srcpath, dstpath, type);
}

var symlink = {
  createSymlink: u$3(createSymlink$1),
  createSymlinkSync: createSymlinkSync$1
};

const {createFile: createFile, createFileSync: createFileSync} = file$1;

const {createLink: createLink, createLinkSync: createLinkSync} = link;

const {createSymlink: createSymlink, createSymlinkSync: createSymlinkSync} = symlink;

var ensure = {
  createFile: createFile,
  createFileSync: createFileSync,
  ensureFile: createFile,
  ensureFileSync: createFileSync,
  createLink: createLink,
  createLinkSync: createLinkSync,
  ensureLink: createLink,
  ensureLinkSync: createLinkSync,
  createSymlink: createSymlink,
  createSymlinkSync: createSymlinkSync,
  ensureSymlink: createSymlink,
  ensureSymlinkSync: createSymlinkSync
};

function stringify$3(obj, {EOL: EOL = '\n', finalEOL: finalEOL = true, replacer: replacer = null, spaces: spaces} = {}) {
  const EOF = finalEOL ? EOL : '';
  const str = JSON.stringify(obj, replacer, spaces);
  return str.replace(/\n/g, EOL) + EOF;
}

function stripBom$1(content) {
  if (Buffer.isBuffer(content)) content = content.toString('utf8');
  return content.replace(/^\uFEFF/, '');
}

var utils = {
  stringify: stringify$3,
  stripBom: stripBom$1
};

let _fs;

try {
  _fs = gracefulFs;
} catch (_) {
  _fs = require$$0$1;
}

const universalify = universalify$1;

const {stringify: stringify$2, stripBom: stripBom} = utils;

async function _readFile(file, options = {}) {
  if (typeof options === 'string') {
    options = {
      encoding: options
    };
  }
  const fs = options.fs || _fs;
  const shouldThrow = 'throws' in options ? options.throws : true;
  let data = await universalify.fromCallback(fs.readFile)(file, options);
  data = stripBom(data);
  let obj;
  try {
    obj = JSON.parse(data, options ? options.reviver : null);
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file}: ${err.message}`;
      throw err;
    } else {
      return null;
    }
  }
  return obj;
}

const readFile = universalify.fromPromise(_readFile);

function readFileSync(file, options = {}) {
  if (typeof options === 'string') {
    options = {
      encoding: options
    };
  }
  const fs = options.fs || _fs;
  const shouldThrow = 'throws' in options ? options.throws : true;
  try {
    let content = fs.readFileSync(file, options);
    content = stripBom(content);
    return JSON.parse(content, options.reviver);
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file}: ${err.message}`;
      throw err;
    } else {
      return null;
    }
  }
}

async function _writeFile(file, obj, options = {}) {
  const fs = options.fs || _fs;
  const str = stringify$2(obj, options);
  await universalify.fromCallback(fs.writeFile)(file, str, options);
}

const writeFile = universalify.fromPromise(_writeFile);

function writeFileSync(file, obj, options = {}) {
  const fs = options.fs || _fs;
  const str = stringify$2(obj, options);
  return fs.writeFileSync(file, str, options);
}

const jsonfile$1 = {
  readFile: readFile,
  readFileSync: readFileSync,
  writeFile: writeFile,
  writeFileSync: writeFileSync
};

var jsonfile_1 = jsonfile$1;

const jsonFile$1 = jsonfile_1;

var jsonfile = {
  readJson: jsonFile$1.readFile,
  readJsonSync: jsonFile$1.readFileSync,
  writeJson: jsonFile$1.writeFile,
  writeJsonSync: jsonFile$1.writeFileSync
};

const u$2 = universalify$1.fromPromise;

const fs$3 = fs$i;

const path$2 = require$$1$1;

const mkdir = mkdirs$2;

const pathExists$1 = pathExists_1.pathExists;

async function outputFile$1(file, data, encoding = 'utf-8') {
  const dir = path$2.dirname(file);
  if (!await pathExists$1(dir)) {
    await mkdir.mkdirs(dir);
  }
  return fs$3.writeFile(file, data, encoding);
}

function outputFileSync$1(file, ...args) {
  const dir = path$2.dirname(file);
  if (!fs$3.existsSync(dir)) {
    mkdir.mkdirsSync(dir);
  }
  fs$3.writeFileSync(file, ...args);
}

var outputFile_1 = {
  outputFile: u$2(outputFile$1),
  outputFileSync: outputFileSync$1
};

const {stringify: stringify$1} = utils;

const {outputFile: outputFile} = outputFile_1;

async function outputJson(file, data, options = {}) {
  const str = stringify$1(data, options);
  await outputFile(file, str, options);
}

var outputJson_1 = outputJson;

const {stringify: stringify} = utils;

const {outputFileSync: outputFileSync} = outputFile_1;

function outputJsonSync(file, data, options) {
  const str = stringify(data, options);
  outputFileSync(file, str, options);
}

var outputJsonSync_1 = outputJsonSync;

const u$1 = universalify$1.fromPromise;

const jsonFile = jsonfile;

jsonFile.outputJson = u$1(outputJson_1);

jsonFile.outputJsonSync = outputJsonSync_1;

jsonFile.outputJSON = jsonFile.outputJson;

jsonFile.outputJSONSync = jsonFile.outputJsonSync;

jsonFile.writeJSON = jsonFile.writeJson;

jsonFile.writeJSONSync = jsonFile.writeJsonSync;

jsonFile.readJSON = jsonFile.readJson;

jsonFile.readJSONSync = jsonFile.readJsonSync;

var json = jsonFile;

const fs$2 = fs$i;

const path$1 = require$$1$1;

const {copy: copy} = copy$1;

const {remove: remove} = remove_1;

const {mkdirp: mkdirp} = mkdirs$2;

const {pathExists: pathExists} = pathExists_1;

const stat$1 = stat$4;

async function move$1(src, dest, opts = {}) {
  const overwrite = opts.overwrite || opts.clobber || false;
  const {srcStat: srcStat, isChangingCase: isChangingCase = false} = await stat$1.checkPaths(src, dest, 'move', opts);
  await stat$1.checkParentPaths(src, srcStat, dest, 'move');
  const destParent = path$1.dirname(dest);
  const parsedParentPath = path$1.parse(destParent);
  if (parsedParentPath.root !== destParent) {
    await mkdirp(destParent);
  }
  return doRename$1(src, dest, overwrite, isChangingCase);
}

async function doRename$1(src, dest, overwrite, isChangingCase) {
  if (!isChangingCase) {
    if (overwrite) {
      await remove(dest);
    } else if (await pathExists(dest)) {
      throw new Error('dest already exists.');
    }
  }
  try {
    await fs$2.rename(src, dest);
  } catch (err) {
    if (err.code !== 'EXDEV') {
      throw err;
    }
    await moveAcrossDevice$1(src, dest, overwrite);
  }
}

async function moveAcrossDevice$1(src, dest, overwrite) {
  const opts = {
    overwrite: overwrite,
    errorOnExist: true,
    preserveTimestamps: true
  };
  await copy(src, dest, opts);
  return remove(src);
}

var move_1 = move$1;

const fs$1 = gracefulFs;

const path = require$$1$1;

const copySync = copy$1.copySync;

const removeSync = remove_1.removeSync;

const mkdirpSync = mkdirs$2.mkdirpSync;

const stat = stat$4;

function moveSync(src, dest, opts) {
  opts = opts || {};
  const overwrite = opts.overwrite || opts.clobber || false;
  const {srcStat: srcStat, isChangingCase: isChangingCase = false} = stat.checkPathsSync(src, dest, 'move', opts);
  stat.checkParentPathsSync(src, srcStat, dest, 'move');
  if (!isParentRoot(dest)) mkdirpSync(path.dirname(dest));
  return doRename(src, dest, overwrite, isChangingCase);
}

function isParentRoot(dest) {
  const parent = path.dirname(dest);
  const parsedPath = path.parse(parent);
  return parsedPath.root === parent;
}

function doRename(src, dest, overwrite, isChangingCase) {
  if (isChangingCase) return rename(src, dest, overwrite);
  if (overwrite) {
    removeSync(dest);
    return rename(src, dest, overwrite);
  }
  if (fs$1.existsSync(dest)) throw new Error('dest already exists.');
  return rename(src, dest, overwrite);
}

function rename(src, dest, overwrite) {
  try {
    fs$1.renameSync(src, dest);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    return moveAcrossDevice(src, dest, overwrite);
  }
}

function moveAcrossDevice(src, dest, overwrite) {
  const opts = {
    overwrite: overwrite,
    errorOnExist: true,
    preserveTimestamps: true
  };
  copySync(src, dest, opts);
  return removeSync(src);
}

var moveSync_1 = moveSync;

const u = universalify$1.fromPromise;

var move = {
  move: u(move_1),
  moveSync: moveSync_1
};

var lib$1 = {
  ...fs$i,
  ...copy$1,
  ...empty,
  ...ensure,
  ...json,
  ...mkdirs$2,
  ...move,
  ...outputFile_1,
  ...pathExists_1,
  ...remove_1
};

const fs = getDefaultExportFromCjs(lib$1);

var LIB;

(() => {
  var t = {
    470: t => {
      function e(t) {
        if ('string' != typeof t) throw new TypeError('Path must be a string. Received ' + JSON.stringify(t));
      }
      function r(t, e) {
        for (var r, n = '', i = 0, o = -1, s = 0, h = 0; h <= t.length; ++h) {
          if (h < t.length) r = t.charCodeAt(h); else {
            if (47 === r) break;
            r = 47;
          }
          if (47 === r) {
            if (o === h - 1 || 1 === s) ; else if (o !== h - 1 && 2 === s) {
              if (n.length < 2 || 2 !== i || 46 !== n.charCodeAt(n.length - 1) || 46 !== n.charCodeAt(n.length - 2)) if (n.length > 2) {
                var a = n.lastIndexOf('/');
                if (a !== n.length - 1) {
                  -1 === a ? (n = '', i = 0) : i = (n = n.slice(0, a)).length - 1 - n.lastIndexOf('/'), 
                  o = h, s = 0;
                  continue;
                }
              } else if (2 === n.length || 1 === n.length) {
                n = '', i = 0, o = h, s = 0;
                continue;
              }
              e && (n.length > 0 ? n += '/..' : n = '..', i = 2);
            } else n.length > 0 ? n += '/' + t.slice(o + 1, h) : n = t.slice(o + 1, h), i = h - o - 1;
            o = h, s = 0;
          } else 46 === r && -1 !== s ? ++s : s = -1;
        }
        return n;
      }
      var n = {
        resolve: function() {
          for (var t, n = '', i = !1, o = arguments.length - 1; o >= -1 && !i; o--) {
            var s;
            o >= 0 ? s = arguments[o] : (void 0 === t && (t = process.cwd()), s = t), e(s), 
            0 !== s.length && (n = s + '/' + n, i = 47 === s.charCodeAt(0));
          }
          return n = r(n, !i), i ? n.length > 0 ? '/' + n : '/' : n.length > 0 ? n : '.';
        },
        normalize: function(t) {
          if (e(t), 0 === t.length) return '.';
          var n = 47 === t.charCodeAt(0), i = 47 === t.charCodeAt(t.length - 1);
          return 0 !== (t = r(t, !n)).length || n || (t = '.'), t.length > 0 && i && (t += '/'), 
          n ? '/' + t : t;
        },
        isAbsolute: function(t) {
          return e(t), t.length > 0 && 47 === t.charCodeAt(0);
        },
        join: function() {
          if (0 === arguments.length) return '.';
          for (var t, r = 0; r < arguments.length; ++r) {
            var i = arguments[r];
            e(i), i.length > 0 && (void 0 === t ? t = i : t += '/' + i);
          }
          return void 0 === t ? '.' : n.normalize(t);
        },
        relative: function(t, r) {
          if (e(t), e(r), t === r) return '';
          if ((t = n.resolve(t)) === (r = n.resolve(r))) return '';
          for (var i = 1; i < t.length && 47 === t.charCodeAt(i); ++i) ;
          for (var o = t.length, s = o - i, h = 1; h < r.length && 47 === r.charCodeAt(h); ++h) ;
          for (var a = r.length - h, c = s < a ? s : a, f = -1, u = 0; u <= c; ++u) {
            if (u === c) {
              if (a > c) {
                if (47 === r.charCodeAt(h + u)) return r.slice(h + u + 1);
                if (0 === u) return r.slice(h + u);
              } else s > c && (47 === t.charCodeAt(i + u) ? f = u : 0 === u && (f = 0));
              break;
            }
            var l = t.charCodeAt(i + u);
            if (l !== r.charCodeAt(h + u)) break;
            47 === l && (f = u);
          }
          var g = '';
          for (u = i + f + 1; u <= o; ++u) u !== o && 47 !== t.charCodeAt(u) || (0 === g.length ? g += '..' : g += '/..');
          return g.length > 0 ? g + r.slice(h + f) : (h += f, 47 === r.charCodeAt(h) && ++h, 
          r.slice(h));
        },
        _makeLong: function(t) {
          return t;
        },
        dirname: function(t) {
          if (e(t), 0 === t.length) return '.';
          for (var r = t.charCodeAt(0), n = 47 === r, i = -1, o = !0, s = t.length - 1; s >= 1; --s) if (47 === (r = t.charCodeAt(s))) {
            if (!o) {
              i = s;
              break;
            }
          } else o = !1;
          return -1 === i ? n ? '/' : '.' : n && 1 === i ? '//' : t.slice(0, i);
        },
        basename: function(t, r) {
          if (void 0 !== r && 'string' != typeof r) throw new TypeError('"ext" argument must be a string');
          e(t);
          var n, i = 0, o = -1, s = !0;
          if (void 0 !== r && r.length > 0 && r.length <= t.length) {
            if (r.length === t.length && r === t) return '';
            var h = r.length - 1, a = -1;
            for (n = t.length - 1; n >= 0; --n) {
              var c = t.charCodeAt(n);
              if (47 === c) {
                if (!s) {
                  i = n + 1;
                  break;
                }
              } else -1 === a && (s = !1, a = n + 1), h >= 0 && (c === r.charCodeAt(h) ? -1 == --h && (o = n) : (h = -1, 
              o = a));
            }
            return i === o ? o = a : -1 === o && (o = t.length), t.slice(i, o);
          }
          for (n = t.length - 1; n >= 0; --n) if (47 === t.charCodeAt(n)) {
            if (!s) {
              i = n + 1;
              break;
            }
          } else -1 === o && (s = !1, o = n + 1);
          return -1 === o ? '' : t.slice(i, o);
        },
        extname: function(t) {
          e(t);
          for (var r = -1, n = 0, i = -1, o = !0, s = 0, h = t.length - 1; h >= 0; --h) {
            var a = t.charCodeAt(h);
            if (47 !== a) -1 === i && (o = !1, i = h + 1), 46 === a ? -1 === r ? r = h : 1 !== s && (s = 1) : -1 !== r && (s = -1); else if (!o) {
              n = h + 1;
              break;
            }
          }
          return -1 === r || -1 === i || 0 === s || 1 === s && r === i - 1 && r === n + 1 ? '' : t.slice(r, i);
        },
        format: function(t) {
          if (null === t || 'object' != typeof t) throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof t);
          return function(t, e) {
            var r = e.dir || e.root, n = e.base || (e.name || '') + (e.ext || '');
            return r ? r === e.root ? r + n : r + '/' + n : n;
          }(0, t);
        },
        parse: function(t) {
          e(t);
          var r = {
            root: '',
            dir: '',
            base: '',
            ext: '',
            name: ''
          };
          if (0 === t.length) return r;
          var n, i = t.charCodeAt(0), o = 47 === i;
          o ? (r.root = '/', n = 1) : n = 0;
          for (var s = -1, h = 0, a = -1, c = !0, f = t.length - 1, u = 0; f >= n; --f) if (47 !== (i = t.charCodeAt(f))) -1 === a && (c = !1, 
          a = f + 1), 46 === i ? -1 === s ? s = f : 1 !== u && (u = 1) : -1 !== s && (u = -1); else if (!c) {
            h = f + 1;
            break;
          }
          return -1 === s || -1 === a || 0 === u || 1 === u && s === a - 1 && s === h + 1 ? -1 !== a && (r.base = r.name = 0 === h && o ? t.slice(1, a) : t.slice(h, a)) : (0 === h && o ? (r.name = t.slice(1, s), 
          r.base = t.slice(1, a)) : (r.name = t.slice(h, s), r.base = t.slice(h, a)), r.ext = t.slice(s, a)), 
          h > 0 ? r.dir = t.slice(0, h - 1) : o && (r.dir = '/'), r;
        },
        sep: '/',
        delimiter: ':',
        win32: null,
        posix: null
      };
      n.posix = n, t.exports = n;
    }
  }, e = {};
  function r(n) {
    var i = e[n];
    if (void 0 !== i) return i.exports;
    var o = e[n] = {
      exports: {}
    };
    return t[n](o, o.exports, r), o.exports;
  }
  r.d = (t, e) => {
    for (var n in e) r.o(e, n) && !r.o(t, n) && Object.defineProperty(t, n, {
      enumerable: !0,
      get: e[n]
    });
  }, r.o = (t, e) => Object.prototype.hasOwnProperty.call(t, e), r.r = t => {
    'undefined' != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t, Symbol.toStringTag, {
      value: 'Module'
    }), Object.defineProperty(t, '__esModule', {
      value: !0
    });
  };
  var n = {};
  (() => {
    let t;
    if (r.r(n), r.d(n, {
      URI: () => f,
      Utils: () => P
    }), 'object' == typeof process) t = 'win32' === process.platform; else if ('object' == typeof navigator) {
      let e = navigator.userAgent;
      t = e.indexOf('Windows') >= 0;
    }
    const e = /^\w[\w\d+.-]*$/, i = /^\//, o = /^\/\//;
    function s(t, r) {
      if (!t.scheme && r) throw new Error(`[UriError]: Scheme is missing: {scheme: "", authority: "${t.authority}", path: "${t.path}", query: "${t.query}", fragment: "${t.fragment}"}`);
      if (t.scheme && !e.test(t.scheme)) throw new Error('[UriError]: Scheme contains illegal characters.');
      if (t.path) if (t.authority) {
        if (!i.test(t.path)) throw new Error('[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character');
      } else if (o.test(t.path)) throw new Error('[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")');
    }
    const h = '', a = '/', c = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
    class f {
      static isUri(t) {
        return t instanceof f || !!t && 'string' == typeof t.authority && 'string' == typeof t.fragment && 'string' == typeof t.path && 'string' == typeof t.query && 'string' == typeof t.scheme && 'string' == typeof t.fsPath && 'function' == typeof t.with && 'function' == typeof t.toString;
      }
      scheme;
      authority;
      path;
      query;
      fragment;
      constructor(t, e, r, n, i, o = !1) {
        'object' == typeof t ? (this.scheme = t.scheme || h, this.authority = t.authority || h, 
        this.path = t.path || h, this.query = t.query || h, this.fragment = t.fragment || h) : (this.scheme = function(t, e) {
          return t || e ? t : 'file';
        }(t, o), this.authority = e || h, this.path = function(t, e) {
          switch (t) {
           case 'https':
           case 'http':
           case 'file':
            e ? e[0] !== a && (e = a + e) : e = a;
          }
          return e;
        }(this.scheme, r || h), this.query = n || h, this.fragment = i || h, s(this, o));
      }
      get fsPath() {
        return m(this, !1);
      }
      with(t) {
        if (!t) return this;
        let {scheme: e, authority: r, path: n, query: i, fragment: o} = t;
        return void 0 === e ? e = this.scheme : null === e && (e = h), void 0 === r ? r = this.authority : null === r && (r = h), 
        void 0 === n ? n = this.path : null === n && (n = h), void 0 === i ? i = this.query : null === i && (i = h), 
        void 0 === o ? o = this.fragment : null === o && (o = h), e === this.scheme && r === this.authority && n === this.path && i === this.query && o === this.fragment ? this : new l(e, r, n, i, o);
      }
      static parse(t, e = !1) {
        const r = c.exec(t);
        return r ? new l(r[2] || h, C(r[4] || h), C(r[5] || h), C(r[7] || h), C(r[9] || h), e) : new l(h, h, h, h, h);
      }
      static file(e) {
        let r = h;
        if (t && (e = e.replace(/\\/g, a)), e[0] === a && e[1] === a) {
          const t = e.indexOf(a, 2);
          -1 === t ? (r = e.substring(2), e = a) : (r = e.substring(2, t), e = e.substring(t) || a);
        }
        return new l('file', r, e, h, h);
      }
      static from(t) {
        const e = new l(t.scheme, t.authority, t.path, t.query, t.fragment);
        return s(e, !0), e;
      }
      toString(t = !1) {
        return y(this, t);
      }
      toJSON() {
        return this;
      }
      static revive(t) {
        if (t) {
          if (t instanceof f) return t;
          {
            const e = new l(t);
            return e._formatted = t.external, e._fsPath = t._sep === u ? t.fsPath : null, e;
          }
        }
        return t;
      }
    }
    const u = t ? 1 : void 0;
    class l extends f {
      _formatted=null;
      _fsPath=null;
      get fsPath() {
        return this._fsPath || (this._fsPath = m(this, !1)), this._fsPath;
      }
      toString(t = !1) {
        return t ? y(this, !0) : (this._formatted || (this._formatted = y(this, !1)), this._formatted);
      }
      toJSON() {
        const t = {
          $mid: 1
        };
        return this._fsPath && (t.fsPath = this._fsPath, t._sep = u), this._formatted && (t.external = this._formatted), 
        this.path && (t.path = this.path), this.scheme && (t.scheme = this.scheme), this.authority && (t.authority = this.authority), 
        this.query && (t.query = this.query), this.fragment && (t.fragment = this.fragment), 
        t;
      }
    }
    const g = {
      58: '%3A',
      47: '%2F',
      63: '%3F',
      35: '%23',
      91: '%5B',
      93: '%5D',
      64: '%40',
      33: '%21',
      36: '%24',
      38: '%26',
      39: '%27',
      40: '%28',
      41: '%29',
      42: '%2A',
      43: '%2B',
      44: '%2C',
      59: '%3B',
      61: '%3D',
      32: '%20'
    };
    function d(t, e, r) {
      let n, i = -1;
      for (let o = 0; o < t.length; o++) {
        const s = t.charCodeAt(o);
        if (s >= 97 && s <= 122 || s >= 65 && s <= 90 || s >= 48 && s <= 57 || 45 === s || 46 === s || 95 === s || 126 === s || e && 47 === s || r && 91 === s || r && 93 === s || r && 58 === s) -1 !== i && (n += encodeURIComponent(t.substring(i, o)), 
        i = -1), void 0 !== n && (n += t.charAt(o)); else {
          void 0 === n && (n = t.substr(0, o));
          const e = g[s];
          void 0 !== e ? (-1 !== i && (n += encodeURIComponent(t.substring(i, o)), i = -1), 
          n += e) : -1 === i && (i = o);
        }
      }
      return -1 !== i && (n += encodeURIComponent(t.substring(i))), void 0 !== n ? n : t;
    }
    function p(t) {
      let e;
      for (let r = 0; r < t.length; r++) {
        const n = t.charCodeAt(r);
        35 === n || 63 === n ? (void 0 === e && (e = t.substr(0, r)), e += g[n]) : void 0 !== e && (e += t[r]);
      }
      return void 0 !== e ? e : t;
    }
    function m(e, r) {
      let n;
      return n = e.authority && e.path.length > 1 && 'file' === e.scheme ? `//${e.authority}${e.path}` : 47 === e.path.charCodeAt(0) && (e.path.charCodeAt(1) >= 65 && e.path.charCodeAt(1) <= 90 || e.path.charCodeAt(1) >= 97 && e.path.charCodeAt(1) <= 122) && 58 === e.path.charCodeAt(2) ? r ? e.path.substr(1) : e.path[1].toLowerCase() + e.path.substr(2) : e.path, 
      t && (n = n.replace(/\//g, '\\')), n;
    }
    function y(t, e) {
      const r = e ? p : d;
      let n = '', {scheme: i, authority: o, path: s, query: h, fragment: c} = t;
      if (i && (n += i, n += ':'), (o || 'file' === i) && (n += a, n += a), o) {
        let t = o.indexOf('@');
        if (-1 !== t) {
          const e = o.substr(0, t);
          o = o.substr(t + 1), t = e.lastIndexOf(':'), -1 === t ? n += r(e, !1, !1) : (n += r(e.substr(0, t), !1, !1), 
          n += ':', n += r(e.substr(t + 1), !1, !0)), n += '@';
        }
        o = o.toLowerCase(), t = o.lastIndexOf(':'), -1 === t ? n += r(o, !1, !0) : (n += r(o.substr(0, t), !1, !0), 
        n += o.substr(t));
      }
      if (s) {
        if (s.length >= 3 && 47 === s.charCodeAt(0) && 58 === s.charCodeAt(2)) {
          const t = s.charCodeAt(1);
          t >= 65 && t <= 90 && (s = `/${String.fromCharCode(t + 32)}:${s.substr(3)}`);
        } else if (s.length >= 2 && 58 === s.charCodeAt(1)) {
          const t = s.charCodeAt(0);
          t >= 65 && t <= 90 && (s = `${String.fromCharCode(t + 32)}:${s.substr(2)}`);
        }
        n += r(s, !0, !1);
      }
      return h && (n += '?', n += r(h, !1, !1)), c && (n += '#', n += e ? c : d(c, !1, !1)), 
      n;
    }
    function v(t) {
      try {
        return decodeURIComponent(t);
      } catch {
        return t.length > 3 ? t.substr(0, 3) + v(t.substr(3)) : t;
      }
    }
    const b = /(%[0-9A-Za-z][0-9A-Za-z])+/g;
    function C(t) {
      return t.match(b) ? t.replace(b, (t => v(t))) : t;
    }
    var A = r(470);
    const w = A.posix || A, x = '/';
    var P;
    !function(t) {
      t.joinPath = function(t, ...e) {
        return t.with({
          path: w.join(t.path, ...e)
        });
      }, t.resolvePath = function(t, ...e) {
        let r = t.path, n = !1;
        r[0] !== x && (r = x + r, n = !0);
        let i = w.resolve(r, ...e);
        return n && i[0] === x && !t.authority && (i = i.substring(1)), t.with({
          path: i
        });
      }, t.dirname = function(t) {
        if (0 === t.path.length || t.path === x) return t;
        let e = w.dirname(t.path);
        return 1 === e.length && 46 === e.charCodeAt(0) && (e = ''), t.with({
          path: e
        });
      }, t.basename = function(t) {
        return w.basename(t.path);
      }, t.extname = function(t) {
        return w.extname(t.path);
      };
    }(P || (P = {}));
  })(), LIB = n;
})();

const {URI: URI, Utils: Utils} = LIB;

class FullTextDocument {
  constructor(uri, languageId, version, content) {
    this._uri = uri;
    this._languageId = languageId;
    this._version = version;
    this._content = content;
    this._lineOffsets = undefined;
  }
  get uri() {
    return this._uri;
  }
  get languageId() {
    return this._languageId;
  }
  get version() {
    return this._version;
  }
  getText(range) {
    if (range) {
      const start = this.offsetAt(range.start);
      const end = this.offsetAt(range.end);
      return this._content.substring(start, end);
    }
    return this._content;
  }
  update(changes, version) {
    for (let change of changes) {
      if (FullTextDocument.isIncremental(change)) {
        const range = getWellformedRange(change.range);
        const startOffset = this.offsetAt(range.start);
        const endOffset = this.offsetAt(range.end);
        this._content = this._content.substring(0, startOffset) + change.text + this._content.substring(endOffset, this._content.length);
        const startLine = Math.max(range.start.line, 0);
        const endLine = Math.max(range.end.line, 0);
        let lineOffsets = this._lineOffsets;
        const addedLineOffsets = computeLineOffsets(change.text, false, startOffset);
        if (endLine - startLine === addedLineOffsets.length) {
          for (let i = 0, len = addedLineOffsets.length; i < len; i++) {
            lineOffsets[i + startLine + 1] = addedLineOffsets[i];
          }
        } else {
          if (addedLineOffsets.length < 1e4) {
            lineOffsets.splice(startLine + 1, endLine - startLine, ...addedLineOffsets);
          } else {
            this._lineOffsets = lineOffsets = lineOffsets.slice(0, startLine + 1).concat(addedLineOffsets, lineOffsets.slice(endLine + 1));
          }
        }
        const diff = change.text.length - (endOffset - startOffset);
        if (diff !== 0) {
          for (let i = startLine + 1 + addedLineOffsets.length, len = lineOffsets.length; i < len; i++) {
            lineOffsets[i] = lineOffsets[i] + diff;
          }
        }
      } else if (FullTextDocument.isFull(change)) {
        this._content = change.text;
        this._lineOffsets = undefined;
      } else {
        throw new Error('Unknown change event received');
      }
    }
    this._version = version;
  }
  getLineOffsets() {
    if (this._lineOffsets === undefined) {
      this._lineOffsets = computeLineOffsets(this._content, true);
    }
    return this._lineOffsets;
  }
  positionAt(offset) {
    offset = Math.max(Math.min(offset, this._content.length), 0);
    let lineOffsets = this.getLineOffsets();
    let low = 0, high = lineOffsets.length;
    if (high === 0) {
      return {
        line: 0,
        character: offset
      };
    }
    while (low < high) {
      let mid = Math.floor((low + high) / 2);
      if (lineOffsets[mid] > offset) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    let line = low - 1;
    return {
      line: line,
      character: offset - lineOffsets[line]
    };
  }
  offsetAt(position) {
    let lineOffsets = this.getLineOffsets();
    if (position.line >= lineOffsets.length) {
      return this._content.length;
    } else if (position.line < 0) {
      return 0;
    }
    let lineOffset = lineOffsets[position.line];
    let nextLineOffset = position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : this._content.length;
    return Math.max(Math.min(lineOffset + position.character, nextLineOffset), lineOffset);
  }
  get lineCount() {
    return this.getLineOffsets().length;
  }
  static isIncremental(event) {
    let candidate = event;
    return candidate !== undefined && candidate !== null && typeof candidate.text === 'string' && candidate.range !== undefined && (candidate.rangeLength === undefined || typeof candidate.rangeLength === 'number');
  }
  static isFull(event) {
    let candidate = event;
    return candidate !== undefined && candidate !== null && typeof candidate.text === 'string' && candidate.range === undefined && candidate.rangeLength === undefined;
  }
}

var TextDocument;

(function(TextDocument) {
  function create(uri, languageId, version, content) {
    return new FullTextDocument(uri, languageId, version, content);
  }
  TextDocument.create = create;
  function update(document, changes, version) {
    if (document instanceof FullTextDocument) {
      document.update(changes, version);
      return document;
    } else {
      throw new Error('TextDocument.update: document must be created by TextDocument.create');
    }
  }
  TextDocument.update = update;
  function applyEdits(document, edits) {
    let text = document.getText();
    let sortedEdits = mergeSort(edits.map(getWellformedEdit), ((a, b) => {
      let diff = a.range.start.line - b.range.start.line;
      if (diff === 0) {
        return a.range.start.character - b.range.start.character;
      }
      return diff;
    }));
    let lastModifiedOffset = 0;
    const spans = [];
    for (const e of sortedEdits) {
      let startOffset = document.offsetAt(e.range.start);
      if (startOffset < lastModifiedOffset) {
        throw new Error('Overlapping edit');
      } else if (startOffset > lastModifiedOffset) {
        spans.push(text.substring(lastModifiedOffset, startOffset));
      }
      if (e.newText.length) {
        spans.push(e.newText);
      }
      lastModifiedOffset = document.offsetAt(e.range.end);
    }
    spans.push(text.substr(lastModifiedOffset));
    return spans.join('');
  }
  TextDocument.applyEdits = applyEdits;
})(TextDocument || (TextDocument = {}));

function mergeSort(data, compare) {
  if (data.length <= 1) {
    return data;
  }
  const p = data.length / 2 | 0;
  const left = data.slice(0, p);
  const right = data.slice(p);
  mergeSort(left, compare);
  mergeSort(right, compare);
  let leftIdx = 0;
  let rightIdx = 0;
  let i = 0;
  while (leftIdx < left.length && rightIdx < right.length) {
    let ret = compare(left[leftIdx], right[rightIdx]);
    if (ret <= 0) {
      data[i++] = left[leftIdx++];
    } else {
      data[i++] = right[rightIdx++];
    }
  }
  while (leftIdx < left.length) {
    data[i++] = left[leftIdx++];
  }
  while (rightIdx < right.length) {
    data[i++] = right[rightIdx++];
  }
  return data;
}

function computeLineOffsets(text, isAtLineStart, textOffset = 0) {
  const result = isAtLineStart ? [ textOffset ] : [];
  for (let i = 0; i < text.length; i++) {
    let ch = text.charCodeAt(i);
    if (ch === 13 || ch === 10) {
      if (ch === 13 && i + 1 < text.length && text.charCodeAt(i + 1) === 10) {
        i++;
      }
      result.push(textOffset + i + 1);
    }
  }
  return result;
}

function getWellformedRange(range) {
  const start = range.start;
  const end = range.end;
  if (start.line > end.line || start.line === end.line && start.character > end.character) {
    return {
      start: end,
      end: start
    };
  }
  return range;
}

function getWellformedEdit(textEdit) {
  const range = getWellformedRange(textEdit.range);
  if (range !== textEdit.range) {
    return {
      newText: textEdit.newText,
      range: range
    };
  }
  return textEdit;
}

const typescript = 'typescript';

const typescriptreact = 'typescriptreact';

const javascript = 'javascript';

const javascriptreact = 'javascriptreact';

const jsTsLanguageModes = [ javascript, javascriptreact, typescript, typescriptreact ];

function isTypeScriptDocument(doc) {
  return [ typescript, typescriptreact ].includes(doc.languageId);
}

var TypeScriptRenameRequest;

(function(TypeScriptRenameRequest) {
  TypeScriptRenameRequest.type = new main$2.RequestType('_typescript.rename');
})(TypeScriptRenameRequest || (TypeScriptRenameRequest = {}));

var CommandTypes;

(function(CommandTypes) {
  CommandTypes['JsxClosingTag'] = 'jsxClosingTag';
  CommandTypes['LinkedEditingRange'] = 'linkedEditingRange';
  CommandTypes['Brace'] = 'brace';
  CommandTypes['BraceCompletion'] = 'braceCompletion';
  CommandTypes['GetSpanOfEnclosingComment'] = 'getSpanOfEnclosingComment';
  CommandTypes['Change'] = 'change';
  CommandTypes['Close'] = 'close';
  CommandTypes['Completions'] = 'completions';
  CommandTypes['CompletionInfo'] = 'completionInfo';
  CommandTypes['CompletionDetails'] = 'completionEntryDetails';
  CommandTypes['CompileOnSaveAffectedFileList'] = 'compileOnSaveAffectedFileList';
  CommandTypes['CompileOnSaveEmitFile'] = 'compileOnSaveEmitFile';
  CommandTypes['Configure'] = 'configure';
  CommandTypes['Definition'] = 'definition';
  CommandTypes['DefinitionAndBoundSpan'] = 'definitionAndBoundSpan';
  CommandTypes['EncodedSemanticClassificationsFull'] = 'encodedSemanticClassifications-full';
  CommandTypes['Implementation'] = 'implementation';
  CommandTypes['Exit'] = 'exit';
  CommandTypes['FileReferences'] = 'fileReferences';
  CommandTypes['Format'] = 'format';
  CommandTypes['Formatonkey'] = 'formatonkey';
  CommandTypes['Geterr'] = 'geterr';
  CommandTypes['GeterrForProject'] = 'geterrForProject';
  CommandTypes['SemanticDiagnosticsSync'] = 'semanticDiagnosticsSync';
  CommandTypes['SyntacticDiagnosticsSync'] = 'syntacticDiagnosticsSync';
  CommandTypes['SuggestionDiagnosticsSync'] = 'suggestionDiagnosticsSync';
  CommandTypes['NavBar'] = 'navbar';
  CommandTypes['Navto'] = 'navto';
  CommandTypes['NavTree'] = 'navtree';
  CommandTypes['NavTreeFull'] = 'navtree-full';
  CommandTypes['Occurrences'] = 'occurrences';
  CommandTypes['DocumentHighlights'] = 'documentHighlights';
  CommandTypes['Open'] = 'open';
  CommandTypes['Quickinfo'] = 'quickinfo';
  CommandTypes['References'] = 'references';
  CommandTypes['Reload'] = 'reload';
  CommandTypes['Rename'] = 'rename';
  CommandTypes['Saveto'] = 'saveto';
  CommandTypes['SignatureHelp'] = 'signatureHelp';
  CommandTypes['FindSourceDefinition'] = 'findSourceDefinition';
  CommandTypes['Status'] = 'status';
  CommandTypes['TypeDefinition'] = 'typeDefinition';
  CommandTypes['ProjectInfo'] = 'projectInfo';
  CommandTypes['ReloadProjects'] = 'reloadProjects';
  CommandTypes['Unknown'] = 'unknown';
  CommandTypes['OpenExternalProject'] = 'openExternalProject';
  CommandTypes['OpenExternalProjects'] = 'openExternalProjects';
  CommandTypes['CloseExternalProject'] = 'closeExternalProject';
  CommandTypes['UpdateOpen'] = 'updateOpen';
  CommandTypes['GetOutliningSpans'] = 'getOutliningSpans';
  CommandTypes['TodoComments'] = 'todoComments';
  CommandTypes['Indentation'] = 'indentation';
  CommandTypes['DocCommentTemplate'] = 'docCommentTemplate';
  CommandTypes['CompilerOptionsForInferredProjects'] = 'compilerOptionsForInferredProjects';
  CommandTypes['GetCodeFixes'] = 'getCodeFixes';
  CommandTypes['GetCombinedCodeFix'] = 'getCombinedCodeFix';
  CommandTypes['ApplyCodeActionCommand'] = 'applyCodeActionCommand';
  CommandTypes['GetSupportedCodeFixes'] = 'getSupportedCodeFixes';
  CommandTypes['GetApplicableRefactors'] = 'getApplicableRefactors';
  CommandTypes['GetEditsForRefactor'] = 'getEditsForRefactor';
  CommandTypes['OrganizeImports'] = 'organizeImports';
  CommandTypes['GetEditsForFileRename'] = 'getEditsForFileRename';
  CommandTypes['ConfigurePlugin'] = 'configurePlugin';
  CommandTypes['SelectionRange'] = 'selectionRange';
  CommandTypes['ToggleLineComment'] = 'toggleLineComment';
  CommandTypes['ToggleMultilineComment'] = 'toggleMultilineComment';
  CommandTypes['CommentSelection'] = 'commentSelection';
  CommandTypes['UncommentSelection'] = 'uncommentSelection';
  CommandTypes['PrepareCallHierarchy'] = 'prepareCallHierarchy';
  CommandTypes['ProvideCallHierarchyIncomingCalls'] = 'provideCallHierarchyIncomingCalls';
  CommandTypes['ProvideCallHierarchyOutgoingCalls'] = 'provideCallHierarchyOutgoingCalls';
  CommandTypes['ProvideInlayHints'] = 'provideInlayHints';
})(CommandTypes || (CommandTypes = {}));

var HighlightSpanKind;

(function(HighlightSpanKind) {
  HighlightSpanKind['none'] = 'none';
  HighlightSpanKind['definition'] = 'definition';
  HighlightSpanKind['reference'] = 'reference';
  HighlightSpanKind['writtenReference'] = 'writtenReference';
})(HighlightSpanKind || (HighlightSpanKind = {}));

var JsxEmit;

(function(JsxEmit) {
  JsxEmit['None'] = 'None';
  JsxEmit['Preserve'] = 'Preserve';
  JsxEmit['ReactNative'] = 'ReactNative';
  JsxEmit['React'] = 'React';
})(JsxEmit || (JsxEmit = {}));

var ModuleKind;

(function(ModuleKind) {
  ModuleKind['None'] = 'None';
  ModuleKind['CommonJS'] = 'CommonJS';
  ModuleKind['AMD'] = 'AMD';
  ModuleKind['UMD'] = 'UMD';
  ModuleKind['System'] = 'System';
  ModuleKind['ES6'] = 'ES6';
  ModuleKind['ES2015'] = 'ES2015';
  ModuleKind['ESNext'] = 'ESNext';
})(ModuleKind || (ModuleKind = {}));

var ModuleResolutionKind;

(function(ModuleResolutionKind) {
  ModuleResolutionKind['Classic'] = 'Classic';
  ModuleResolutionKind['Node'] = 'Node';
})(ModuleResolutionKind || (ModuleResolutionKind = {}));

var SemicolonPreference;

(function(SemicolonPreference) {
  SemicolonPreference['Ignore'] = 'ignore';
  SemicolonPreference['Insert'] = 'insert';
  SemicolonPreference['Remove'] = 'remove';
})(SemicolonPreference || (SemicolonPreference = {}));

var ScriptElementKind;

(function(ScriptElementKind) {
  ScriptElementKind['unknown'] = '';
  ScriptElementKind['warning'] = 'warning';
  ScriptElementKind['keyword'] = 'keyword';
  ScriptElementKind['scriptElement'] = 'script';
  ScriptElementKind['moduleElement'] = 'module';
  ScriptElementKind['classElement'] = 'class';
  ScriptElementKind['localClassElement'] = 'local class';
  ScriptElementKind['interfaceElement'] = 'interface';
  ScriptElementKind['typeElement'] = 'type';
  ScriptElementKind['enumElement'] = 'enum';
  ScriptElementKind['enumMemberElement'] = 'enum member';
  ScriptElementKind['variableElement'] = 'var';
  ScriptElementKind['localVariableElement'] = 'local var';
  ScriptElementKind['variableUsingElement'] = 'using';
  ScriptElementKind['variableAwaitUsingElement'] = 'await using';
  ScriptElementKind['functionElement'] = 'function';
  ScriptElementKind['localFunctionElement'] = 'local function';
  ScriptElementKind['memberFunctionElement'] = 'method';
  ScriptElementKind['memberGetAccessorElement'] = 'getter';
  ScriptElementKind['memberSetAccessorElement'] = 'setter';
  ScriptElementKind['memberVariableElement'] = 'property';
  ScriptElementKind['memberAccessorVariableElement'] = 'accessor';
  ScriptElementKind['constructorImplementationElement'] = 'constructor';
  ScriptElementKind['callSignatureElement'] = 'call';
  ScriptElementKind['indexSignatureElement'] = 'index';
  ScriptElementKind['constructSignatureElement'] = 'construct';
  ScriptElementKind['parameterElement'] = 'parameter';
  ScriptElementKind['typeParameterElement'] = 'type parameter';
  ScriptElementKind['primitiveType'] = 'primitive type';
  ScriptElementKind['label'] = 'label';
  ScriptElementKind['alias'] = 'alias';
  ScriptElementKind['constElement'] = 'const';
  ScriptElementKind['letElement'] = 'let';
  ScriptElementKind['directory'] = 'directory';
  ScriptElementKind['externalModuleName'] = 'external module name';
  ScriptElementKind['jsxAttribute'] = 'JSX attribute';
  ScriptElementKind['string'] = 'string';
  ScriptElementKind['link'] = 'link';
  ScriptElementKind['linkName'] = 'link name';
  ScriptElementKind['linkText'] = 'link text';
})(ScriptElementKind || (ScriptElementKind = {}));

var ScriptElementKindModifier;

(function(ScriptElementKindModifier) {
  ScriptElementKindModifier['none'] = '';
  ScriptElementKindModifier['publicMemberModifier'] = 'public';
  ScriptElementKindModifier['privateMemberModifier'] = 'private';
  ScriptElementKindModifier['protectedMemberModifier'] = 'protected';
  ScriptElementKindModifier['exportedModifier'] = 'export';
  ScriptElementKindModifier['ambientModifier'] = 'declare';
  ScriptElementKindModifier['staticModifier'] = 'static';
  ScriptElementKindModifier['abstractModifier'] = 'abstract';
  ScriptElementKindModifier['optionalModifier'] = 'optional';
  ScriptElementKindModifier['deprecatedModifier'] = 'deprecated';
  ScriptElementKindModifier['dtsModifier'] = '.d.ts';
  ScriptElementKindModifier['tsModifier'] = '.ts';
  ScriptElementKindModifier['tsxModifier'] = '.tsx';
  ScriptElementKindModifier['jsModifier'] = '.js';
  ScriptElementKindModifier['jsxModifier'] = '.jsx';
  ScriptElementKindModifier['jsonModifier'] = '.json';
  ScriptElementKindModifier['dmtsModifier'] = '.d.mts';
  ScriptElementKindModifier['mtsModifier'] = '.mts';
  ScriptElementKindModifier['mjsModifier'] = '.mjs';
  ScriptElementKindModifier['dctsModifier'] = '.d.cts';
  ScriptElementKindModifier['ctsModifier'] = '.cts';
  ScriptElementKindModifier['cjsModifier'] = '.cjs';
})(ScriptElementKindModifier || (ScriptElementKindModifier = {}));

var ScriptTarget;

(function(ScriptTarget) {
  ScriptTarget['ES3'] = 'ES3';
  ScriptTarget['ES5'] = 'ES5';
  ScriptTarget['ES6'] = 'ES6';
  ScriptTarget['ES2015'] = 'ES2015';
  ScriptTarget['ES2016'] = 'ES2016';
  ScriptTarget['ES2017'] = 'ES2017';
  ScriptTarget['ES2018'] = 'ES2018';
  ScriptTarget['ES2019'] = 'ES2019';
  ScriptTarget['ES2020'] = 'ES2020';
  ScriptTarget['ES2021'] = 'ES2021';
  ScriptTarget['ES2022'] = 'ES2022';
  ScriptTarget['ESNext'] = 'ESNext';
})(ScriptTarget || (ScriptTarget = {}));

var SymbolDisplayPartKind;

(function(SymbolDisplayPartKind) {
  SymbolDisplayPartKind[SymbolDisplayPartKind['aliasName'] = 0] = 'aliasName';
  SymbolDisplayPartKind[SymbolDisplayPartKind['className'] = 1] = 'className';
  SymbolDisplayPartKind[SymbolDisplayPartKind['enumName'] = 2] = 'enumName';
  SymbolDisplayPartKind[SymbolDisplayPartKind['fieldName'] = 3] = 'fieldName';
  SymbolDisplayPartKind[SymbolDisplayPartKind['interfaceName'] = 4] = 'interfaceName';
  SymbolDisplayPartKind[SymbolDisplayPartKind['keyword'] = 5] = 'keyword';
  SymbolDisplayPartKind[SymbolDisplayPartKind['lineBreak'] = 6] = 'lineBreak';
  SymbolDisplayPartKind[SymbolDisplayPartKind['numericLiteral'] = 7] = 'numericLiteral';
  SymbolDisplayPartKind[SymbolDisplayPartKind['stringLiteral'] = 8] = 'stringLiteral';
  SymbolDisplayPartKind[SymbolDisplayPartKind['localName'] = 9] = 'localName';
  SymbolDisplayPartKind[SymbolDisplayPartKind['methodName'] = 10] = 'methodName';
  SymbolDisplayPartKind[SymbolDisplayPartKind['moduleName'] = 11] = 'moduleName';
  SymbolDisplayPartKind[SymbolDisplayPartKind['operator'] = 12] = 'operator';
  SymbolDisplayPartKind[SymbolDisplayPartKind['parameterName'] = 13] = 'parameterName';
  SymbolDisplayPartKind[SymbolDisplayPartKind['propertyName'] = 14] = 'propertyName';
  SymbolDisplayPartKind[SymbolDisplayPartKind['punctuation'] = 15] = 'punctuation';
  SymbolDisplayPartKind[SymbolDisplayPartKind['space'] = 16] = 'space';
  SymbolDisplayPartKind[SymbolDisplayPartKind['text'] = 17] = 'text';
  SymbolDisplayPartKind[SymbolDisplayPartKind['typeParameterName'] = 18] = 'typeParameterName';
  SymbolDisplayPartKind[SymbolDisplayPartKind['enumMemberName'] = 19] = 'enumMemberName';
  SymbolDisplayPartKind[SymbolDisplayPartKind['functionName'] = 20] = 'functionName';
  SymbolDisplayPartKind[SymbolDisplayPartKind['regularExpressionLiteral'] = 21] = 'regularExpressionLiteral';
  SymbolDisplayPartKind[SymbolDisplayPartKind['link'] = 22] = 'link';
  SymbolDisplayPartKind[SymbolDisplayPartKind['linkName'] = 23] = 'linkName';
  SymbolDisplayPartKind[SymbolDisplayPartKind['linkText'] = 24] = 'linkText';
})(SymbolDisplayPartKind || (SymbolDisplayPartKind = {}));

var OrganizeImportsMode;

(function(OrganizeImportsMode) {
  OrganizeImportsMode['All'] = 'All';
  OrganizeImportsMode['SortAndCombine'] = 'SortAndCombine';
  OrganizeImportsMode['RemoveUnused'] = 'RemoveUnused';
})(OrganizeImportsMode || (OrganizeImportsMode = {}));

class KindModifiers {}

KindModifiers.optional = 'optional';

KindModifiers.deprecated = 'deprecated';

KindModifiers.dtsFile = '.d.ts';

KindModifiers.tsFile = '.ts';

KindModifiers.tsxFile = '.tsx';

KindModifiers.jsFile = '.js';

KindModifiers.jsxFile = '.jsx';

KindModifiers.jsonFile = '.json';

KindModifiers.fileExtensionKindModifiers = [ KindModifiers.dtsFile, KindModifiers.tsFile, KindModifiers.tsxFile, KindModifiers.jsFile, KindModifiers.jsxFile, KindModifiers.jsonFile ];

const SYMBOL_DISPLAY_PART_KIND_MAP = {
  aliasName: 0,
  className: 1,
  enumName: 2,
  fieldName: 3,
  interfaceName: 4,
  keyword: 5,
  lineBreak: 6,
  numericLiteral: 7,
  stringLiteral: 8,
  localName: 9,
  methodName: 10,
  moduleName: 11,
  operator: 12,
  parameterName: 13,
  propertyName: 14,
  punctuation: 15,
  space: 16,
  text: 17,
  typeParameterName: 18,
  enumMemberName: 19,
  functionName: 20,
  regularExpressionLiteral: 21,
  link: 22,
  linkName: 23,
  linkText: 24
};

function toSymbolDisplayPartKind(kind) {
  return SYMBOL_DISPLAY_PART_KIND_MAP[kind];
}

var ServerType;

(function(ServerType) {
  ServerType['Syntax'] = 'syntax';
  ServerType['Semantic'] = 'semantic';
})(ServerType || (ServerType = {}));

var ServerResponse;

(function(ServerResponse) {
  class Cancelled {
    constructor(reason) {
      this.reason = reason;
      this.type = 'cancelled';
    }
  }
  ServerResponse.Cancelled = Cancelled;
  ServerResponse.NoContent = {
    type: 'noContent'
  };
  ServerResponse.NoServer = {
    type: 'noServer'
  };
})(ServerResponse || (ServerResponse = {}));

var ClientCapability;

(function(ClientCapability) {
  ClientCapability[ClientCapability['Syntax'] = 0] = 'Syntax';
  ClientCapability[ClientCapability['EnhancedSyntax'] = 1] = 'EnhancedSyntax';
  ClientCapability[ClientCapability['Semantic'] = 2] = 'Semantic';
})(ClientCapability || (ClientCapability = {}));

class ClientCapabilities {
  constructor(...capabilities) {
    this.capabilities = new Set(capabilities);
  }
  has(capability) {
    return this.capabilities.has(capability);
  }
}

var re$2 = {
  exports: {}
};

const SEMVER_SPEC_VERSION = '2.0.0';

const MAX_LENGTH$1 = 256;

const MAX_SAFE_INTEGER$1 = Number.MAX_SAFE_INTEGER || 9007199254740991;

const MAX_SAFE_COMPONENT_LENGTH = 16;

const MAX_SAFE_BUILD_LENGTH = MAX_LENGTH$1 - 6;

const RELEASE_TYPES = [ 'major', 'premajor', 'minor', 'preminor', 'patch', 'prepatch', 'prerelease' ];

var constants$1 = {
  MAX_LENGTH: MAX_LENGTH$1,
  MAX_SAFE_COMPONENT_LENGTH: MAX_SAFE_COMPONENT_LENGTH,
  MAX_SAFE_BUILD_LENGTH: MAX_SAFE_BUILD_LENGTH,
  MAX_SAFE_INTEGER: MAX_SAFE_INTEGER$1,
  RELEASE_TYPES: RELEASE_TYPES,
  SEMVER_SPEC_VERSION: SEMVER_SPEC_VERSION,
  FLAG_INCLUDE_PRERELEASE: 1,
  FLAG_LOOSE: 2
};

const debug$1 = typeof process === 'object' && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error('SEMVER', ...args) : () => {};

var debug_1 = debug$1;

(function(module, exports) {
  const {MAX_SAFE_COMPONENT_LENGTH: MAX_SAFE_COMPONENT_LENGTH, MAX_SAFE_BUILD_LENGTH: MAX_SAFE_BUILD_LENGTH, MAX_LENGTH: MAX_LENGTH} = constants$1;
  const debug = debug_1;
  exports = module.exports = {};
  const re = exports.re = [];
  const safeRe = exports.safeRe = [];
  const src = exports.src = [];
  const t = exports.t = {};
  let R = 0;
  const LETTERDASHNUMBER = '[a-zA-Z0-9-]';
  const safeRegexReplacements = [ [ '\\s', 1 ], [ '\\d', MAX_LENGTH ], [ LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH ] ];
  const makeSafeRegex = value => {
    for (const [token, max] of safeRegexReplacements) {
      value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
    }
    return value;
  };
  const createToken = (name, value, isGlobal) => {
    const safe = makeSafeRegex(value);
    const index = R++;
    debug(name, index, value);
    t[name] = index;
    src[index] = value;
    re[index] = new RegExp(value, isGlobal ? 'g' : undefined);
    safeRe[index] = new RegExp(safe, isGlobal ? 'g' : undefined);
  };
  createToken('NUMERICIDENTIFIER', '0|[1-9]\\d*');
  createToken('NUMERICIDENTIFIERLOOSE', '\\d+');
  createToken('NONNUMERICIDENTIFIER', `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
  createToken('MAINVERSION', `(${src[t.NUMERICIDENTIFIER]})\\.` + `(${src[t.NUMERICIDENTIFIER]})\\.` + `(${src[t.NUMERICIDENTIFIER]})`);
  createToken('MAINVERSIONLOOSE', `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` + `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` + `(${src[t.NUMERICIDENTIFIERLOOSE]})`);
  createToken('PRERELEASEIDENTIFIER', `(?:${src[t.NUMERICIDENTIFIER]}|${src[t.NONNUMERICIDENTIFIER]})`);
  createToken('PRERELEASEIDENTIFIERLOOSE', `(?:${src[t.NUMERICIDENTIFIERLOOSE]}|${src[t.NONNUMERICIDENTIFIER]})`);
  createToken('PRERELEASE', `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
  createToken('PRERELEASELOOSE', `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
  createToken('BUILDIDENTIFIER', `${LETTERDASHNUMBER}+`);
  createToken('BUILD', `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
  createToken('FULLPLAIN', `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
  createToken('FULL', `^${src[t.FULLPLAIN]}$`);
  createToken('LOOSEPLAIN', `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
  createToken('LOOSE', `^${src[t.LOOSEPLAIN]}$`);
  createToken('GTLT', '((?:<|>)?=?)');
  createToken('XRANGEIDENTIFIERLOOSE', `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
  createToken('XRANGEIDENTIFIER', `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
  createToken('XRANGEPLAIN', `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})` + `(?:\\.(${src[t.XRANGEIDENTIFIER]})` + `(?:\\.(${src[t.XRANGEIDENTIFIER]})` + `(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?` + `)?)?`);
  createToken('XRANGEPLAINLOOSE', `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})` + `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` + `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` + `(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?` + `)?)?`);
  createToken('XRANGE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
  createToken('XRANGELOOSE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
  createToken('COERCEPLAIN', `${'(^|[^\\d])' + '(\\d{1,'}${MAX_SAFE_COMPONENT_LENGTH}})` + `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?` + `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
  createToken('COERCE', `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
  createToken('COERCEFULL', src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?` + `(?:${src[t.BUILD]})?` + `(?:$|[^\\d])`);
  createToken('COERCERTL', src[t.COERCE], true);
  createToken('COERCERTLFULL', src[t.COERCEFULL], true);
  createToken('LONETILDE', '(?:~>?)');
  createToken('TILDETRIM', `(\\s*)${src[t.LONETILDE]}\\s+`, true);
  exports.tildeTrimReplace = '$1~';
  createToken('TILDE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
  createToken('TILDELOOSE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
  createToken('LONECARET', '(?:\\^)');
  createToken('CARETTRIM', `(\\s*)${src[t.LONECARET]}\\s+`, true);
  exports.caretTrimReplace = '$1^';
  createToken('CARET', `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
  createToken('CARETLOOSE', `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
  createToken('COMPARATORLOOSE', `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
  createToken('COMPARATOR', `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
  createToken('COMPARATORTRIM', `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
  exports.comparatorTrimReplace = '$1$2$3';
  createToken('HYPHENRANGE', `^\\s*(${src[t.XRANGEPLAIN]})` + `\\s+-\\s+` + `(${src[t.XRANGEPLAIN]})` + `\\s*$`);
  createToken('HYPHENRANGELOOSE', `^\\s*(${src[t.XRANGEPLAINLOOSE]})` + `\\s+-\\s+` + `(${src[t.XRANGEPLAINLOOSE]})` + `\\s*$`);
  createToken('STAR', '(<|>)?=?\\s*\\*');
  createToken('GTE0', '^\\s*>=\\s*0\\.0\\.0\\s*$');
  createToken('GTE0PRE', '^\\s*>=\\s*0\\.0\\.0-0\\s*$');
})(re$2, re$2.exports);

var reExports = re$2.exports;

const looseOption = Object.freeze({
  loose: true
});

const emptyOpts = Object.freeze({});

const parseOptions$1 = options => {
  if (!options) {
    return emptyOpts;
  }
  if (typeof options !== 'object') {
    return looseOption;
  }
  return options;
};

var parseOptions_1 = parseOptions$1;

const numeric = /^[0-9]+$/;

const compareIdentifiers$1 = (a, b) => {
  const anum = numeric.test(a);
  const bnum = numeric.test(b);
  if (anum && bnum) {
    a = +a;
    b = +b;
  }
  return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
};

const rcompareIdentifiers = (a, b) => compareIdentifiers$1(b, a);

var identifiers$1 = {
  compareIdentifiers: compareIdentifiers$1,
  rcompareIdentifiers: rcompareIdentifiers
};

const debug = debug_1;

const {MAX_LENGTH: MAX_LENGTH, MAX_SAFE_INTEGER: MAX_SAFE_INTEGER} = constants$1;

const {safeRe: re$1, t: t$1} = reExports;

const parseOptions = parseOptions_1;

const {compareIdentifiers: compareIdentifiers} = identifiers$1;

let SemVer$d = class SemVer {
  constructor(version, options) {
    options = parseOptions(options);
    if (version instanceof SemVer) {
      if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
        return version;
      } else {
        version = version.version;
      }
    } else if (typeof version !== 'string') {
      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
    }
    if (version.length > MAX_LENGTH) {
      throw new TypeError(`version is longer than ${MAX_LENGTH} characters`);
    }
    debug('SemVer', version, options);
    this.options = options;
    this.loose = !!options.loose;
    this.includePrerelease = !!options.includePrerelease;
    const m = version.trim().match(options.loose ? re$1[t$1.LOOSE] : re$1[t$1.FULL]);
    if (!m) {
      throw new TypeError(`Invalid Version: ${version}`);
    }
    this.raw = version;
    this.major = +m[1];
    this.minor = +m[2];
    this.patch = +m[3];
    if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
      throw new TypeError('Invalid major version');
    }
    if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
      throw new TypeError('Invalid minor version');
    }
    if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
      throw new TypeError('Invalid patch version');
    }
    if (!m[4]) {
      this.prerelease = [];
    } else {
      this.prerelease = m[4].split('.').map((id => {
        if (/^[0-9]+$/.test(id)) {
          const num = +id;
          if (num >= 0 && num < MAX_SAFE_INTEGER) {
            return num;
          }
        }
        return id;
      }));
    }
    this.build = m[5] ? m[5].split('.') : [];
    this.format();
  }
  format() {
    this.version = `${this.major}.${this.minor}.${this.patch}`;
    if (this.prerelease.length) {
      this.version += `-${this.prerelease.join('.')}`;
    }
    return this.version;
  }
  toString() {
    return this.version;
  }
  compare(other) {
    debug('SemVer.compare', this.version, this.options, other);
    if (!(other instanceof SemVer)) {
      if (typeof other === 'string' && other === this.version) {
        return 0;
      }
      other = new SemVer(other, this.options);
    }
    if (other.version === this.version) {
      return 0;
    }
    return this.compareMain(other) || this.comparePre(other);
  }
  compareMain(other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options);
    }
    return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
  }
  comparePre(other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options);
    }
    if (this.prerelease.length && !other.prerelease.length) {
      return -1;
    } else if (!this.prerelease.length && other.prerelease.length) {
      return 1;
    } else if (!this.prerelease.length && !other.prerelease.length) {
      return 0;
    }
    let i = 0;
    do {
      const a = this.prerelease[i];
      const b = other.prerelease[i];
      debug('prerelease compare', i, a, b);
      if (a === undefined && b === undefined) {
        return 0;
      } else if (b === undefined) {
        return 1;
      } else if (a === undefined) {
        return -1;
      } else if (a === b) {
        continue;
      } else {
        return compareIdentifiers(a, b);
      }
    } while (++i);
  }
  compareBuild(other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options);
    }
    let i = 0;
    do {
      const a = this.build[i];
      const b = other.build[i];
      debug('prerelease compare', i, a, b);
      if (a === undefined && b === undefined) {
        return 0;
      } else if (b === undefined) {
        return 1;
      } else if (a === undefined) {
        return -1;
      } else if (a === b) {
        continue;
      } else {
        return compareIdentifiers(a, b);
      }
    } while (++i);
  }
  inc(release, identifier, identifierBase) {
    switch (release) {
     case 'premajor':
      this.prerelease.length = 0;
      this.patch = 0;
      this.minor = 0;
      this.major++;
      this.inc('pre', identifier, identifierBase);
      break;

     case 'preminor':
      this.prerelease.length = 0;
      this.patch = 0;
      this.minor++;
      this.inc('pre', identifier, identifierBase);
      break;

     case 'prepatch':
      this.prerelease.length = 0;
      this.inc('patch', identifier, identifierBase);
      this.inc('pre', identifier, identifierBase);
      break;

     case 'prerelease':
      if (this.prerelease.length === 0) {
        this.inc('patch', identifier, identifierBase);
      }
      this.inc('pre', identifier, identifierBase);
      break;

     case 'major':
      if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
        this.major++;
      }
      this.minor = 0;
      this.patch = 0;
      this.prerelease = [];
      break;

     case 'minor':
      if (this.patch !== 0 || this.prerelease.length === 0) {
        this.minor++;
      }
      this.patch = 0;
      this.prerelease = [];
      break;

     case 'patch':
      if (this.prerelease.length === 0) {
        this.patch++;
      }
      this.prerelease = [];
      break;

     case 'pre':
      {
        const base = Number(identifierBase) ? 1 : 0;
        if (!identifier && identifierBase === false) {
          throw new Error('invalid increment argument: identifier is empty');
        }
        if (this.prerelease.length === 0) {
          this.prerelease = [ base ];
        } else {
          let i = this.prerelease.length;
          while (--i >= 0) {
            if (typeof this.prerelease[i] === 'number') {
              this.prerelease[i]++;
              i = -2;
            }
          }
          if (i === -1) {
            if (identifier === this.prerelease.join('.') && identifierBase === false) {
              throw new Error('invalid increment argument: identifier already exists');
            }
            this.prerelease.push(base);
          }
        }
        if (identifier) {
          let prerelease = [ identifier, base ];
          if (identifierBase === false) {
            prerelease = [ identifier ];
          }
          if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
            if (isNaN(this.prerelease[1])) {
              this.prerelease = prerelease;
            }
          } else {
            this.prerelease = prerelease;
          }
        }
        break;
      }

     default:
      throw new Error(`invalid increment argument: ${release}`);
    }
    this.raw = this.format();
    if (this.build.length) {
      this.raw += `+${this.build.join('.')}`;
    }
    return this;
  }
};

var semver$2 = SemVer$d;

const SemVer$c = semver$2;

const parse$6 = (version, options, throwErrors = false) => {
  if (version instanceof SemVer$c) {
    return version;
  }
  try {
    return new SemVer$c(version, options);
  } catch (er) {
    if (!throwErrors) {
      return null;
    }
    throw er;
  }
};

var parse_1 = parse$6;

const parse$5 = parse_1;

const valid$2 = (version, options) => {
  const v = parse$5(version, options);
  return v ? v.version : null;
};

var valid_1 = valid$2;

const parse$4 = parse_1;

const clean$1 = (version, options) => {
  const s = parse$4(version.trim().replace(/^[=v]+/, ''), options);
  return s ? s.version : null;
};

var clean_1 = clean$1;

const SemVer$b = semver$2;

const inc$1 = (version, release, options, identifier, identifierBase) => {
  if (typeof options === 'string') {
    identifierBase = identifier;
    identifier = options;
    options = undefined;
  }
  try {
    return new SemVer$b(version instanceof SemVer$b ? version.version : version, options).inc(release, identifier, identifierBase).version;
  } catch (er) {
    return null;
  }
};

var inc_1 = inc$1;

const parse$3 = parse_1;

const diff$1 = (version1, version2) => {
  const v1 = parse$3(version1, null, true);
  const v2 = parse$3(version2, null, true);
  const comparison = v1.compare(v2);
  if (comparison === 0) {
    return null;
  }
  const v1Higher = comparison > 0;
  const highVersion = v1Higher ? v1 : v2;
  const lowVersion = v1Higher ? v2 : v1;
  const highHasPre = !!highVersion.prerelease.length;
  const lowHasPre = !!lowVersion.prerelease.length;
  if (lowHasPre && !highHasPre) {
    if (!lowVersion.patch && !lowVersion.minor) {
      return 'major';
    }
    if (highVersion.patch) {
      return 'patch';
    }
    if (highVersion.minor) {
      return 'minor';
    }
    return 'major';
  }
  const prefix = highHasPre ? 'pre' : '';
  if (v1.major !== v2.major) {
    return prefix + 'major';
  }
  if (v1.minor !== v2.minor) {
    return prefix + 'minor';
  }
  if (v1.patch !== v2.patch) {
    return prefix + 'patch';
  }
  return 'prerelease';
};

var diff_1 = diff$1;

const SemVer$a = semver$2;

const major$1 = (a, loose) => new SemVer$a(a, loose).major;

var major_1 = major$1;

const SemVer$9 = semver$2;

const minor$1 = (a, loose) => new SemVer$9(a, loose).minor;

var minor_1 = minor$1;

const SemVer$8 = semver$2;

const patch$1 = (a, loose) => new SemVer$8(a, loose).patch;

var patch_1 = patch$1;

const parse$2 = parse_1;

const prerelease$1 = (version, options) => {
  const parsed = parse$2(version, options);
  return parsed && parsed.prerelease.length ? parsed.prerelease : null;
};

var prerelease_1 = prerelease$1;

const SemVer$7 = semver$2;

const compare$b = (a, b, loose) => new SemVer$7(a, loose).compare(new SemVer$7(b, loose));

var compare_1 = compare$b;

const compare$a = compare_1;

const rcompare$1 = (a, b, loose) => compare$a(b, a, loose);

var rcompare_1 = rcompare$1;

const compare$9 = compare_1;

const compareLoose$1 = (a, b) => compare$9(a, b, true);

var compareLoose_1 = compareLoose$1;

const SemVer$6 = semver$2;

const compareBuild$3 = (a, b, loose) => {
  const versionA = new SemVer$6(a, loose);
  const versionB = new SemVer$6(b, loose);
  return versionA.compare(versionB) || versionA.compareBuild(versionB);
};

var compareBuild_1 = compareBuild$3;

const compareBuild$2 = compareBuild_1;

const sort$1 = (list, loose) => list.sort(((a, b) => compareBuild$2(a, b, loose)));

var sort_1 = sort$1;

const compareBuild$1 = compareBuild_1;

const rsort$1 = (list, loose) => list.sort(((a, b) => compareBuild$1(b, a, loose)));

var rsort_1 = rsort$1;

const compare$8 = compare_1;

const gt$4 = (a, b, loose) => compare$8(a, b, loose) > 0;

var gt_1 = gt$4;

const compare$7 = compare_1;

const lt$3 = (a, b, loose) => compare$7(a, b, loose) < 0;

var lt_1 = lt$3;

const compare$6 = compare_1;

const eq$2 = (a, b, loose) => compare$6(a, b, loose) === 0;

var eq_1 = eq$2;

const compare$5 = compare_1;

const neq$2 = (a, b, loose) => compare$5(a, b, loose) !== 0;

var neq_1 = neq$2;

const compare$4 = compare_1;

const gte$3 = (a, b, loose) => compare$4(a, b, loose) >= 0;

var gte_1 = gte$3;

const compare$3 = compare_1;

const lte$3 = (a, b, loose) => compare$3(a, b, loose) <= 0;

var lte_1 = lte$3;

const eq$1 = eq_1;

const neq$1 = neq_1;

const gt$3 = gt_1;

const gte$2 = gte_1;

const lt$2 = lt_1;

const lte$2 = lte_1;

const cmp$1 = (a, op, b, loose) => {
  switch (op) {
   case '===':
    if (typeof a === 'object') {
      a = a.version;
    }
    if (typeof b === 'object') {
      b = b.version;
    }
    return a === b;

   case '!==':
    if (typeof a === 'object') {
      a = a.version;
    }
    if (typeof b === 'object') {
      b = b.version;
    }
    return a !== b;

   case '':
   case '=':
   case '==':
    return eq$1(a, b, loose);

   case '!=':
    return neq$1(a, b, loose);

   case '>':
    return gt$3(a, b, loose);

   case '>=':
    return gte$2(a, b, loose);

   case '<':
    return lt$2(a, b, loose);

   case '<=':
    return lte$2(a, b, loose);

   default:
    throw new TypeError(`Invalid operator: ${op}`);
  }
};

var cmp_1 = cmp$1;

const SemVer$5 = semver$2;

const parse$1 = parse_1;

const {safeRe: re, t: t} = reExports;

const coerce$1 = (version, options) => {
  if (version instanceof SemVer$5) {
    return version;
  }
  if (typeof version === 'number') {
    version = String(version);
  }
  if (typeof version !== 'string') {
    return null;
  }
  options = options || {};
  let match = null;
  if (!options.rtl) {
    match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
  } else {
    const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
    let next;
    while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
      if (!match || next.index + next[0].length !== match.index + match[0].length) {
        match = next;
      }
      coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
    }
    coerceRtlRegex.lastIndex = -1;
  }
  if (match === null) {
    return null;
  }
  const major = match[2];
  const minor = match[3] || '0';
  const patch = match[4] || '0';
  const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : '';
  const build = options.includePrerelease && match[6] ? `+${match[6]}` : '';
  return parse$1(`${major}.${minor}.${patch}${prerelease}${build}`, options);
};

var coerce_1 = coerce$1;

var iterator;

var hasRequiredIterator;

function requireIterator() {
  if (hasRequiredIterator) return iterator;
  hasRequiredIterator = 1;
  iterator = function(Yallist) {
    Yallist.prototype[Symbol.iterator] = function*() {
      for (let walker = this.head; walker; walker = walker.next) {
        yield walker.value;
      }
    };
  };
  return iterator;
}

var yallist;

var hasRequiredYallist;

function requireYallist() {
  if (hasRequiredYallist) return yallist;
  hasRequiredYallist = 1;
  yallist = Yallist;
  Yallist.Node = Node;
  Yallist.create = Yallist;
  function Yallist(list) {
    var self = this;
    if (!(self instanceof Yallist)) {
      self = new Yallist;
    }
    self.tail = null;
    self.head = null;
    self.length = 0;
    if (list && typeof list.forEach === 'function') {
      list.forEach((function(item) {
        self.push(item);
      }));
    } else if (arguments.length > 0) {
      for (var i = 0, l = arguments.length; i < l; i++) {
        self.push(arguments[i]);
      }
    }
    return self;
  }
  Yallist.prototype.removeNode = function(node) {
    if (node.list !== this) {
      throw new Error('removing node which does not belong to this list');
    }
    var next = node.next;
    var prev = node.prev;
    if (next) {
      next.prev = prev;
    }
    if (prev) {
      prev.next = next;
    }
    if (node === this.head) {
      this.head = next;
    }
    if (node === this.tail) {
      this.tail = prev;
    }
    node.list.length--;
    node.next = null;
    node.prev = null;
    node.list = null;
    return next;
  };
  Yallist.prototype.unshiftNode = function(node) {
    if (node === this.head) {
      return;
    }
    if (node.list) {
      node.list.removeNode(node);
    }
    var head = this.head;
    node.list = this;
    node.next = head;
    if (head) {
      head.prev = node;
    }
    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }
    this.length++;
  };
  Yallist.prototype.pushNode = function(node) {
    if (node === this.tail) {
      return;
    }
    if (node.list) {
      node.list.removeNode(node);
    }
    var tail = this.tail;
    node.list = this;
    node.prev = tail;
    if (tail) {
      tail.next = node;
    }
    this.tail = node;
    if (!this.head) {
      this.head = node;
    }
    this.length++;
  };
  Yallist.prototype.push = function() {
    for (var i = 0, l = arguments.length; i < l; i++) {
      push(this, arguments[i]);
    }
    return this.length;
  };
  Yallist.prototype.unshift = function() {
    for (var i = 0, l = arguments.length; i < l; i++) {
      unshift(this, arguments[i]);
    }
    return this.length;
  };
  Yallist.prototype.pop = function() {
    if (!this.tail) {
      return undefined;
    }
    var res = this.tail.value;
    this.tail = this.tail.prev;
    if (this.tail) {
      this.tail.next = null;
    } else {
      this.head = null;
    }
    this.length--;
    return res;
  };
  Yallist.prototype.shift = function() {
    if (!this.head) {
      return undefined;
    }
    var res = this.head.value;
    this.head = this.head.next;
    if (this.head) {
      this.head.prev = null;
    } else {
      this.tail = null;
    }
    this.length--;
    return res;
  };
  Yallist.prototype.forEach = function(fn, thisp) {
    thisp = thisp || this;
    for (var walker = this.head, i = 0; walker !== null; i++) {
      fn.call(thisp, walker.value, i, this);
      walker = walker.next;
    }
  };
  Yallist.prototype.forEachReverse = function(fn, thisp) {
    thisp = thisp || this;
    for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
      fn.call(thisp, walker.value, i, this);
      walker = walker.prev;
    }
  };
  Yallist.prototype.get = function(n) {
    for (var i = 0, walker = this.head; walker !== null && i < n; i++) {
      walker = walker.next;
    }
    if (i === n && walker !== null) {
      return walker.value;
    }
  };
  Yallist.prototype.getReverse = function(n) {
    for (var i = 0, walker = this.tail; walker !== null && i < n; i++) {
      walker = walker.prev;
    }
    if (i === n && walker !== null) {
      return walker.value;
    }
  };
  Yallist.prototype.map = function(fn, thisp) {
    thisp = thisp || this;
    var res = new Yallist;
    for (var walker = this.head; walker !== null; ) {
      res.push(fn.call(thisp, walker.value, this));
      walker = walker.next;
    }
    return res;
  };
  Yallist.prototype.mapReverse = function(fn, thisp) {
    thisp = thisp || this;
    var res = new Yallist;
    for (var walker = this.tail; walker !== null; ) {
      res.push(fn.call(thisp, walker.value, this));
      walker = walker.prev;
    }
    return res;
  };
  Yallist.prototype.reduce = function(fn, initial) {
    var acc;
    var walker = this.head;
    if (arguments.length > 1) {
      acc = initial;
    } else if (this.head) {
      walker = this.head.next;
      acc = this.head.value;
    } else {
      throw new TypeError('Reduce of empty list with no initial value');
    }
    for (var i = 0; walker !== null; i++) {
      acc = fn(acc, walker.value, i);
      walker = walker.next;
    }
    return acc;
  };
  Yallist.prototype.reduceReverse = function(fn, initial) {
    var acc;
    var walker = this.tail;
    if (arguments.length > 1) {
      acc = initial;
    } else if (this.tail) {
      walker = this.tail.prev;
      acc = this.tail.value;
    } else {
      throw new TypeError('Reduce of empty list with no initial value');
    }
    for (var i = this.length - 1; walker !== null; i--) {
      acc = fn(acc, walker.value, i);
      walker = walker.prev;
    }
    return acc;
  };
  Yallist.prototype.toArray = function() {
    var arr = new Array(this.length);
    for (var i = 0, walker = this.head; walker !== null; i++) {
      arr[i] = walker.value;
      walker = walker.next;
    }
    return arr;
  };
  Yallist.prototype.toArrayReverse = function() {
    var arr = new Array(this.length);
    for (var i = 0, walker = this.tail; walker !== null; i++) {
      arr[i] = walker.value;
      walker = walker.prev;
    }
    return arr;
  };
  Yallist.prototype.slice = function(from, to) {
    to = to || this.length;
    if (to < 0) {
      to += this.length;
    }
    from = from || 0;
    if (from < 0) {
      from += this.length;
    }
    var ret = new Yallist;
    if (to < from || to < 0) {
      return ret;
    }
    if (from < 0) {
      from = 0;
    }
    if (to > this.length) {
      to = this.length;
    }
    for (var i = 0, walker = this.head; walker !== null && i < from; i++) {
      walker = walker.next;
    }
    for (;walker !== null && i < to; i++, walker = walker.next) {
      ret.push(walker.value);
    }
    return ret;
  };
  Yallist.prototype.sliceReverse = function(from, to) {
    to = to || this.length;
    if (to < 0) {
      to += this.length;
    }
    from = from || 0;
    if (from < 0) {
      from += this.length;
    }
    var ret = new Yallist;
    if (to < from || to < 0) {
      return ret;
    }
    if (from < 0) {
      from = 0;
    }
    if (to > this.length) {
      to = this.length;
    }
    for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) {
      walker = walker.prev;
    }
    for (;walker !== null && i > from; i--, walker = walker.prev) {
      ret.push(walker.value);
    }
    return ret;
  };
  Yallist.prototype.splice = function(start, deleteCount, ...nodes) {
    if (start > this.length) {
      start = this.length - 1;
    }
    if (start < 0) {
      start = this.length + start;
    }
    for (var i = 0, walker = this.head; walker !== null && i < start; i++) {
      walker = walker.next;
    }
    var ret = [];
    for (var i = 0; walker && i < deleteCount; i++) {
      ret.push(walker.value);
      walker = this.removeNode(walker);
    }
    if (walker === null) {
      walker = this.tail;
    }
    if (walker !== this.head && walker !== this.tail) {
      walker = walker.prev;
    }
    for (var i = 0; i < nodes.length; i++) {
      walker = insert(this, walker, nodes[i]);
    }
    return ret;
  };
  Yallist.prototype.reverse = function() {
    var head = this.head;
    var tail = this.tail;
    for (var walker = head; walker !== null; walker = walker.prev) {
      var p = walker.prev;
      walker.prev = walker.next;
      walker.next = p;
    }
    this.head = tail;
    this.tail = head;
    return this;
  };
  function insert(self, node, value) {
    var inserted = node === self.head ? new Node(value, null, node, self) : new Node(value, node, node.next, self);
    if (inserted.next === null) {
      self.tail = inserted;
    }
    if (inserted.prev === null) {
      self.head = inserted;
    }
    self.length++;
    return inserted;
  }
  function push(self, item) {
    self.tail = new Node(item, self.tail, null, self);
    if (!self.head) {
      self.head = self.tail;
    }
    self.length++;
  }
  function unshift(self, item) {
    self.head = new Node(item, null, self.head, self);
    if (!self.tail) {
      self.tail = self.head;
    }
    self.length++;
  }
  function Node(value, prev, next, list) {
    if (!(this instanceof Node)) {
      return new Node(value, prev, next, list);
    }
    this.list = list;
    this.value = value;
    if (prev) {
      prev.next = this;
      this.prev = prev;
    } else {
      this.prev = null;
    }
    if (next) {
      next.prev = this;
      this.next = next;
    } else {
      this.next = null;
    }
  }
  try {
    requireIterator()(Yallist);
  } catch (er) {}
  return yallist;
}

var lruCache;

var hasRequiredLruCache;

function requireLruCache() {
  if (hasRequiredLruCache) return lruCache;
  hasRequiredLruCache = 1;
  const Yallist = requireYallist();
  const MAX = Symbol('max');
  const LENGTH = Symbol('length');
  const LENGTH_CALCULATOR = Symbol('lengthCalculator');
  const ALLOW_STALE = Symbol('allowStale');
  const MAX_AGE = Symbol('maxAge');
  const DISPOSE = Symbol('dispose');
  const NO_DISPOSE_ON_SET = Symbol('noDisposeOnSet');
  const LRU_LIST = Symbol('lruList');
  const CACHE = Symbol('cache');
  const UPDATE_AGE_ON_GET = Symbol('updateAgeOnGet');
  const naiveLength = () => 1;
  class LRUCache {
    constructor(options) {
      if (typeof options === 'number') options = {
        max: options
      };
      if (!options) options = {};
      if (options.max && (typeof options.max !== 'number' || options.max < 0)) throw new TypeError('max must be a non-negative number');
      this[MAX] = options.max || Infinity;
      const lc = options.length || naiveLength;
      this[LENGTH_CALCULATOR] = typeof lc !== 'function' ? naiveLength : lc;
      this[ALLOW_STALE] = options.stale || false;
      if (options.maxAge && typeof options.maxAge !== 'number') throw new TypeError('maxAge must be a number');
      this[MAX_AGE] = options.maxAge || 0;
      this[DISPOSE] = options.dispose;
      this[NO_DISPOSE_ON_SET] = options.noDisposeOnSet || false;
      this[UPDATE_AGE_ON_GET] = options.updateAgeOnGet || false;
      this.reset();
    }
    set max(mL) {
      if (typeof mL !== 'number' || mL < 0) throw new TypeError('max must be a non-negative number');
      this[MAX] = mL || Infinity;
      trim(this);
    }
    get max() {
      return this[MAX];
    }
    set allowStale(allowStale) {
      this[ALLOW_STALE] = !!allowStale;
    }
    get allowStale() {
      return this[ALLOW_STALE];
    }
    set maxAge(mA) {
      if (typeof mA !== 'number') throw new TypeError('maxAge must be a non-negative number');
      this[MAX_AGE] = mA;
      trim(this);
    }
    get maxAge() {
      return this[MAX_AGE];
    }
    set lengthCalculator(lC) {
      if (typeof lC !== 'function') lC = naiveLength;
      if (lC !== this[LENGTH_CALCULATOR]) {
        this[LENGTH_CALCULATOR] = lC;
        this[LENGTH] = 0;
        this[LRU_LIST].forEach((hit => {
          hit.length = this[LENGTH_CALCULATOR](hit.value, hit.key);
          this[LENGTH] += hit.length;
        }));
      }
      trim(this);
    }
    get lengthCalculator() {
      return this[LENGTH_CALCULATOR];
    }
    get length() {
      return this[LENGTH];
    }
    get itemCount() {
      return this[LRU_LIST].length;
    }
    rforEach(fn, thisp) {
      thisp = thisp || this;
      for (let walker = this[LRU_LIST].tail; walker !== null; ) {
        const prev = walker.prev;
        forEachStep(this, fn, walker, thisp);
        walker = prev;
      }
    }
    forEach(fn, thisp) {
      thisp = thisp || this;
      for (let walker = this[LRU_LIST].head; walker !== null; ) {
        const next = walker.next;
        forEachStep(this, fn, walker, thisp);
        walker = next;
      }
    }
    keys() {
      return this[LRU_LIST].toArray().map((k => k.key));
    }
    values() {
      return this[LRU_LIST].toArray().map((k => k.value));
    }
    reset() {
      if (this[DISPOSE] && this[LRU_LIST] && this[LRU_LIST].length) {
        this[LRU_LIST].forEach((hit => this[DISPOSE](hit.key, hit.value)));
      }
      this[CACHE] = new Map;
      this[LRU_LIST] = new Yallist;
      this[LENGTH] = 0;
    }
    dump() {
      return this[LRU_LIST].map((hit => isStale(this, hit) ? false : {
        k: hit.key,
        v: hit.value,
        e: hit.now + (hit.maxAge || 0)
      })).toArray().filter((h => h));
    }
    dumpLru() {
      return this[LRU_LIST];
    }
    set(key, value, maxAge) {
      maxAge = maxAge || this[MAX_AGE];
      if (maxAge && typeof maxAge !== 'number') throw new TypeError('maxAge must be a number');
      const now = maxAge ? Date.now() : 0;
      const len = this[LENGTH_CALCULATOR](value, key);
      if (this[CACHE].has(key)) {
        if (len > this[MAX]) {
          del(this, this[CACHE].get(key));
          return false;
        }
        const node = this[CACHE].get(key);
        const item = node.value;
        if (this[DISPOSE]) {
          if (!this[NO_DISPOSE_ON_SET]) this[DISPOSE](key, item.value);
        }
        item.now = now;
        item.maxAge = maxAge;
        item.value = value;
        this[LENGTH] += len - item.length;
        item.length = len;
        this.get(key);
        trim(this);
        return true;
      }
      const hit = new Entry(key, value, len, now, maxAge);
      if (hit.length > this[MAX]) {
        if (this[DISPOSE]) this[DISPOSE](key, value);
        return false;
      }
      this[LENGTH] += hit.length;
      this[LRU_LIST].unshift(hit);
      this[CACHE].set(key, this[LRU_LIST].head);
      trim(this);
      return true;
    }
    has(key) {
      if (!this[CACHE].has(key)) return false;
      const hit = this[CACHE].get(key).value;
      return !isStale(this, hit);
    }
    get(key) {
      return get(this, key, true);
    }
    peek(key) {
      return get(this, key, false);
    }
    pop() {
      const node = this[LRU_LIST].tail;
      if (!node) return null;
      del(this, node);
      return node.value;
    }
    del(key) {
      del(this, this[CACHE].get(key));
    }
    load(arr) {
      this.reset();
      const now = Date.now();
      for (let l = arr.length - 1; l >= 0; l--) {
        const hit = arr[l];
        const expiresAt = hit.e || 0;
        if (expiresAt === 0) this.set(hit.k, hit.v); else {
          const maxAge = expiresAt - now;
          if (maxAge > 0) {
            this.set(hit.k, hit.v, maxAge);
          }
        }
      }
    }
    prune() {
      this[CACHE].forEach(((value, key) => get(this, key, false)));
    }
  }
  const get = (self, key, doUse) => {
    const node = self[CACHE].get(key);
    if (node) {
      const hit = node.value;
      if (isStale(self, hit)) {
        del(self, node);
        if (!self[ALLOW_STALE]) return undefined;
      } else {
        if (doUse) {
          if (self[UPDATE_AGE_ON_GET]) node.value.now = Date.now();
          self[LRU_LIST].unshiftNode(node);
        }
      }
      return hit.value;
    }
  };
  const isStale = (self, hit) => {
    if (!hit || !hit.maxAge && !self[MAX_AGE]) return false;
    const diff = Date.now() - hit.now;
    return hit.maxAge ? diff > hit.maxAge : self[MAX_AGE] && diff > self[MAX_AGE];
  };
  const trim = self => {
    if (self[LENGTH] > self[MAX]) {
      for (let walker = self[LRU_LIST].tail; self[LENGTH] > self[MAX] && walker !== null; ) {
        const prev = walker.prev;
        del(self, walker);
        walker = prev;
      }
    }
  };
  const del = (self, node) => {
    if (node) {
      const hit = node.value;
      if (self[DISPOSE]) self[DISPOSE](hit.key, hit.value);
      self[LENGTH] -= hit.length;
      self[CACHE].delete(hit.key);
      self[LRU_LIST].removeNode(node);
    }
  };
  class Entry {
    constructor(key, value, length, now, maxAge) {
      this.key = key;
      this.value = value;
      this.length = length;
      this.now = now;
      this.maxAge = maxAge || 0;
    }
  }
  const forEachStep = (self, fn, node, thisp) => {
    let hit = node.value;
    if (isStale(self, hit)) {
      del(self, node);
      if (!self[ALLOW_STALE]) hit = undefined;
    }
    if (hit) fn.call(thisp, hit.value, hit.key, self);
  };
  lruCache = LRUCache;
  return lruCache;
}

var range;

var hasRequiredRange;

function requireRange() {
  if (hasRequiredRange) return range;
  hasRequiredRange = 1;
  class Range {
    constructor(range, options) {
      options = parseOptions(options);
      if (range instanceof Range) {
        if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
          return range;
        } else {
          return new Range(range.raw, options);
        }
      }
      if (range instanceof Comparator) {
        this.raw = range.value;
        this.set = [ [ range ] ];
        this.format();
        return this;
      }
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      this.raw = range.trim().split(/\s+/).join(' ');
      this.set = this.raw.split('||').map((r => this.parseRange(r.trim()))).filter((c => c.length));
      if (!this.set.length) {
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      }
      if (this.set.length > 1) {
        const first = this.set[0];
        this.set = this.set.filter((c => !isNullSet(c[0])));
        if (this.set.length === 0) {
          this.set = [ first ];
        } else if (this.set.length > 1) {
          for (const c of this.set) {
            if (c.length === 1 && isAny(c[0])) {
              this.set = [ c ];
              break;
            }
          }
        }
      }
      this.format();
    }
    format() {
      this.range = this.set.map((comps => comps.join(' ').trim())).join('||').trim();
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(range) {
      const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
      const memoKey = memoOpts + ':' + range;
      const cached = cache.get(memoKey);
      if (cached) {
        return cached;
      }
      const loose = this.options.loose;
      const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
      range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
      debug('hyphen replace', range);
      range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
      debug('comparator trim', range);
      range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
      debug('tilde trim', range);
      range = range.replace(re[t.CARETTRIM], caretTrimReplace);
      debug('caret trim', range);
      let rangeList = range.split(' ').map((comp => parseComparator(comp, this.options))).join(' ').split(/\s+/).map((comp => replaceGTE0(comp, this.options)));
      if (loose) {
        rangeList = rangeList.filter((comp => {
          debug('loose invalid filter', comp, this.options);
          return !!comp.match(re[t.COMPARATORLOOSE]);
        }));
      }
      debug('range list', rangeList);
      const rangeMap = new Map;
      const comparators = rangeList.map((comp => new Comparator(comp, this.options)));
      for (const comp of comparators) {
        if (isNullSet(comp)) {
          return [ comp ];
        }
        rangeMap.set(comp.value, comp);
      }
      if (rangeMap.size > 1 && rangeMap.has('')) {
        rangeMap.delete('');
      }
      const result = [ ...rangeMap.values() ];
      cache.set(memoKey, result);
      return result;
    }
    intersects(range, options) {
      if (!(range instanceof Range)) {
        throw new TypeError('a Range is required');
      }
      return this.set.some((thisComparators => isSatisfiable(thisComparators, options) && range.set.some((rangeComparators => isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator => rangeComparators.every((rangeComparator => thisComparator.intersects(rangeComparator, options)))))))));
    }
    test(version) {
      if (!version) {
        return false;
      }
      if (typeof version === 'string') {
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      }
      for (let i = 0; i < this.set.length; i++) {
        if (testSet(this.set[i], version, this.options)) {
          return true;
        }
      }
      return false;
    }
  }
  range = Range;
  const LRU = requireLruCache();
  const cache = new LRU({
    max: 1e3
  });
  const parseOptions = parseOptions_1;
  const Comparator = requireComparator();
  const debug = debug_1;
  const SemVer = semver$2;
  const {safeRe: re, t: t, comparatorTrimReplace: comparatorTrimReplace, tildeTrimReplace: tildeTrimReplace, caretTrimReplace: caretTrimReplace} = reExports;
  const {FLAG_INCLUDE_PRERELEASE: FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE: FLAG_LOOSE} = constants$1;
  const isNullSet = c => c.value === '<0.0.0-0';
  const isAny = c => c.value === '';
  const isSatisfiable = (comparators, options) => {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while (result && remainingComparators.length) {
      result = remainingComparators.every((otherComparator => testComparator.intersects(otherComparator, options)));
      testComparator = remainingComparators.pop();
    }
    return result;
  };
  const parseComparator = (comp, options) => {
    debug('comp', comp, options);
    comp = replaceCarets(comp, options);
    debug('caret', comp);
    comp = replaceTildes(comp, options);
    debug('tildes', comp);
    comp = replaceXRanges(comp, options);
    debug('xrange', comp);
    comp = replaceStars(comp, options);
    debug('stars', comp);
    return comp;
  };
  const isX = id => !id || id.toLowerCase() === 'x' || id === '*';
  const replaceTildes = (comp, options) => comp.trim().split(/\s+/).map((c => replaceTilde(c, options))).join(' ');
  const replaceTilde = (comp, options) => {
    const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
    return comp.replace(r, ((_, M, m, p, pr) => {
      debug('tilde', comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = '';
      } else if (isX(m)) {
        ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
      } else if (pr) {
        debug('replaceTilde pr', pr);
        ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
      } else {
        ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
      }
      debug('tilde return', ret);
      return ret;
    }));
  };
  const replaceCarets = (comp, options) => comp.trim().split(/\s+/).map((c => replaceCaret(c, options))).join(' ');
  const replaceCaret = (comp, options) => {
    debug('caret', comp, options);
    const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
    const z = options.includePrerelease ? '-0' : '';
    return comp.replace(r, ((_, M, m, p, pr) => {
      debug('caret', comp, _, M, m, p, pr);
      let ret;
      if (isX(M)) {
        ret = '';
      } else if (isX(m)) {
        ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
      } else if (isX(p)) {
        if (M === '0') {
          ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
        }
      } else if (pr) {
        debug('replaceCaret pr', pr);
        if (M === '0') {
          if (m === '0') {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
        }
      } else {
        debug('no pr');
        if (M === '0') {
          if (m === '0') {
            ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
          } else {
            ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
          }
        } else {
          ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
        }
      }
      debug('caret return', ret);
      return ret;
    }));
  };
  const replaceXRanges = (comp, options) => {
    debug('replaceXRanges', comp, options);
    return comp.split(/\s+/).map((c => replaceXRange(c, options))).join(' ');
  };
  const replaceXRange = (comp, options) => {
    comp = comp.trim();
    const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
    return comp.replace(r, ((ret, gtlt, M, m, p, pr) => {
      debug('xRange', comp, ret, gtlt, M, m, p, pr);
      const xM = isX(M);
      const xm = xM || isX(m);
      const xp = xm || isX(p);
      const anyX = xp;
      if (gtlt === '=' && anyX) {
        gtlt = '';
      }
      pr = options.includePrerelease ? '-0' : '';
      if (xM) {
        if (gtlt === '>' || gtlt === '<') {
          ret = '<0.0.0-0';
        } else {
          ret = '*';
        }
      } else if (gtlt && anyX) {
        if (xm) {
          m = 0;
        }
        p = 0;
        if (gtlt === '>') {
          gtlt = '>=';
          if (xm) {
            M = +M + 1;
            m = 0;
            p = 0;
          } else {
            m = +m + 1;
            p = 0;
          }
        } else if (gtlt === '<=') {
          gtlt = '<';
          if (xm) {
            M = +M + 1;
          } else {
            m = +m + 1;
          }
        }
        if (gtlt === '<') {
          pr = '-0';
        }
        ret = `${gtlt + M}.${m}.${p}${pr}`;
      } else if (xm) {
        ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
      } else if (xp) {
        ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
      }
      debug('xRange return', ret);
      return ret;
    }));
  };
  const replaceStars = (comp, options) => {
    debug('replaceStars', comp, options);
    return comp.trim().replace(re[t.STAR], '');
  };
  const replaceGTE0 = (comp, options) => {
    debug('replaceGTE0', comp, options);
    return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], '');
  };
  const hyphenReplace = incPr => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr, tb) => {
    if (isX(fM)) {
      from = '';
    } else if (isX(fm)) {
      from = `>=${fM}.0.0${incPr ? '-0' : ''}`;
    } else if (isX(fp)) {
      from = `>=${fM}.${fm}.0${incPr ? '-0' : ''}`;
    } else if (fpr) {
      from = `>=${from}`;
    } else {
      from = `>=${from}${incPr ? '-0' : ''}`;
    }
    if (isX(tM)) {
      to = '';
    } else if (isX(tm)) {
      to = `<${+tM + 1}.0.0-0`;
    } else if (isX(tp)) {
      to = `<${tM}.${+tm + 1}.0-0`;
    } else if (tpr) {
      to = `<=${tM}.${tm}.${tp}-${tpr}`;
    } else if (incPr) {
      to = `<${tM}.${tm}.${+tp + 1}-0`;
    } else {
      to = `<=${to}`;
    }
    return `${from} ${to}`.trim();
  };
  const testSet = (set, version, options) => {
    for (let i = 0; i < set.length; i++) {
      if (!set[i].test(version)) {
        return false;
      }
    }
    if (version.prerelease.length && !options.includePrerelease) {
      for (let i = 0; i < set.length; i++) {
        debug(set[i].semver);
        if (set[i].semver === Comparator.ANY) {
          continue;
        }
        if (set[i].semver.prerelease.length > 0) {
          const allowed = set[i].semver;
          if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
            return true;
          }
        }
      }
      return false;
    }
    return true;
  };
  return range;
}

var comparator;

var hasRequiredComparator;

function requireComparator() {
  if (hasRequiredComparator) return comparator;
  hasRequiredComparator = 1;
  const ANY = Symbol('SemVer ANY');
  class Comparator {
    static get ANY() {
      return ANY;
    }
    constructor(comp, options) {
      options = parseOptions(options);
      if (comp instanceof Comparator) {
        if (comp.loose === !!options.loose) {
          return comp;
        } else {
          comp = comp.value;
        }
      }
      comp = comp.trim().split(/\s+/).join(' ');
      debug('comparator', comp, options);
      this.options = options;
      this.loose = !!options.loose;
      this.parse(comp);
      if (this.semver === ANY) {
        this.value = '';
      } else {
        this.value = this.operator + this.semver.version;
      }
      debug('comp', this);
    }
    parse(comp) {
      const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
      const m = comp.match(r);
      if (!m) {
        throw new TypeError(`Invalid comparator: ${comp}`);
      }
      this.operator = m[1] !== undefined ? m[1] : '';
      if (this.operator === '=') {
        this.operator = '';
      }
      if (!m[2]) {
        this.semver = ANY;
      } else {
        this.semver = new SemVer(m[2], this.options.loose);
      }
    }
    toString() {
      return this.value;
    }
    test(version) {
      debug('Comparator.test', version, this.options.loose);
      if (this.semver === ANY || version === ANY) {
        return true;
      }
      if (typeof version === 'string') {
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      }
      return cmp(version, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
      if (!(comp instanceof Comparator)) {
        throw new TypeError('a Comparator is required');
      }
      if (this.operator === '') {
        if (this.value === '') {
          return true;
        }
        return new Range(comp.value, options).test(this.value);
      } else if (comp.operator === '') {
        if (comp.value === '') {
          return true;
        }
        return new Range(this.value, options).test(comp.semver);
      }
      options = parseOptions(options);
      if (options.includePrerelease && (this.value === '<0.0.0-0' || comp.value === '<0.0.0-0')) {
        return false;
      }
      if (!options.includePrerelease && (this.value.startsWith('<0.0.0') || comp.value.startsWith('<0.0.0'))) {
        return false;
      }
      if (this.operator.startsWith('>') && comp.operator.startsWith('>')) {
        return true;
      }
      if (this.operator.startsWith('<') && comp.operator.startsWith('<')) {
        return true;
      }
      if (this.semver.version === comp.semver.version && this.operator.includes('=') && comp.operator.includes('=')) {
        return true;
      }
      if (cmp(this.semver, '<', comp.semver, options) && this.operator.startsWith('>') && comp.operator.startsWith('<')) {
        return true;
      }
      if (cmp(this.semver, '>', comp.semver, options) && this.operator.startsWith('<') && comp.operator.startsWith('>')) {
        return true;
      }
      return false;
    }
  }
  comparator = Comparator;
  const parseOptions = parseOptions_1;
  const {safeRe: re, t: t} = reExports;
  const cmp = cmp_1;
  const debug = debug_1;
  const SemVer = semver$2;
  const Range = requireRange();
  return comparator;
}

const Range$a = requireRange();

const satisfies$4 = (version, range, options) => {
  try {
    range = new Range$a(range, options);
  } catch (er) {
    return false;
  }
  return range.test(version);
};

var satisfies_1 = satisfies$4;

const Range$9 = requireRange();

const toComparators$1 = (range, options) => new Range$9(range, options).set.map((comp => comp.map((c => c.value)).join(' ').trim().split(' ')));

var toComparators_1 = toComparators$1;

const SemVer$4 = semver$2;

const Range$8 = requireRange();

const maxSatisfying$1 = (versions, range, options) => {
  let max = null;
  let maxSV = null;
  let rangeObj = null;
  try {
    rangeObj = new Range$8(range, options);
  } catch (er) {
    return null;
  }
  versions.forEach((v => {
    if (rangeObj.test(v)) {
      if (!max || maxSV.compare(v) === -1) {
        max = v;
        maxSV = new SemVer$4(max, options);
      }
    }
  }));
  return max;
};

var maxSatisfying_1 = maxSatisfying$1;

const SemVer$3 = semver$2;

const Range$7 = requireRange();

const minSatisfying$1 = (versions, range, options) => {
  let min = null;
  let minSV = null;
  let rangeObj = null;
  try {
    rangeObj = new Range$7(range, options);
  } catch (er) {
    return null;
  }
  versions.forEach((v => {
    if (rangeObj.test(v)) {
      if (!min || minSV.compare(v) === 1) {
        min = v;
        minSV = new SemVer$3(min, options);
      }
    }
  }));
  return min;
};

var minSatisfying_1 = minSatisfying$1;

const SemVer$2 = semver$2;

const Range$6 = requireRange();

const gt$2 = gt_1;

const minVersion$1 = (range, loose) => {
  range = new Range$6(range, loose);
  let minver = new SemVer$2('0.0.0');
  if (range.test(minver)) {
    return minver;
  }
  minver = new SemVer$2('0.0.0-0');
  if (range.test(minver)) {
    return minver;
  }
  minver = null;
  for (let i = 0; i < range.set.length; ++i) {
    const comparators = range.set[i];
    let setMin = null;
    comparators.forEach((comparator => {
      const compver = new SemVer$2(comparator.semver.version);
      switch (comparator.operator) {
       case '>':
        if (compver.prerelease.length === 0) {
          compver.patch++;
        } else {
          compver.prerelease.push(0);
        }
        compver.raw = compver.format();

       case '':
       case '>=':
        if (!setMin || gt$2(compver, setMin)) {
          setMin = compver;
        }
        break;

       case '<':
       case '<=':
        break;

       default:
        throw new Error(`Unexpected operation: ${comparator.operator}`);
      }
    }));
    if (setMin && (!minver || gt$2(minver, setMin))) {
      minver = setMin;
    }
  }
  if (minver && range.test(minver)) {
    return minver;
  }
  return null;
};

var minVersion_1 = minVersion$1;

const Range$5 = requireRange();

const validRange$1 = (range, options) => {
  try {
    return new Range$5(range, options).range || '*';
  } catch (er) {
    return null;
  }
};

var valid$1 = validRange$1;

const SemVer$1 = semver$2;

const Comparator$2 = requireComparator();

const {ANY: ANY$1} = Comparator$2;

const Range$4 = requireRange();

const satisfies$3 = satisfies_1;

const gt$1 = gt_1;

const lt$1 = lt_1;

const lte$1 = lte_1;

const gte$1 = gte_1;

const outside$3 = (version, range, hilo, options) => {
  version = new SemVer$1(version, options);
  range = new Range$4(range, options);
  let gtfn, ltefn, ltfn, comp, ecomp;
  switch (hilo) {
   case '>':
    gtfn = gt$1;
    ltefn = lte$1;
    ltfn = lt$1;
    comp = '>';
    ecomp = '>=';
    break;

   case '<':
    gtfn = lt$1;
    ltefn = gte$1;
    ltfn = gt$1;
    comp = '<';
    ecomp = '<=';
    break;

   default:
    throw new TypeError('Must provide a hilo val of "<" or ">"');
  }
  if (satisfies$3(version, range, options)) {
    return false;
  }
  for (let i = 0; i < range.set.length; ++i) {
    const comparators = range.set[i];
    let high = null;
    let low = null;
    comparators.forEach((comparator => {
      if (comparator.semver === ANY$1) {
        comparator = new Comparator$2('>=0.0.0');
      }
      high = high || comparator;
      low = low || comparator;
      if (gtfn(comparator.semver, high.semver, options)) {
        high = comparator;
      } else if (ltfn(comparator.semver, low.semver, options)) {
        low = comparator;
      }
    }));
    if (high.operator === comp || high.operator === ecomp) {
      return false;
    }
    if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
      return false;
    } else if (low.operator === ecomp && ltfn(version, low.semver)) {
      return false;
    }
  }
  return true;
};

var outside_1 = outside$3;

const outside$2 = outside_1;

const gtr$1 = (version, range, options) => outside$2(version, range, '>', options);

var gtr_1 = gtr$1;

const outside$1 = outside_1;

const ltr$1 = (version, range, options) => outside$1(version, range, '<', options);

var ltr_1 = ltr$1;

const Range$3 = requireRange();

const intersects$1 = (r1, r2, options) => {
  r1 = new Range$3(r1, options);
  r2 = new Range$3(r2, options);
  return r1.intersects(r2, options);
};

var intersects_1 = intersects$1;

const satisfies$2 = satisfies_1;

const compare$2 = compare_1;

var simplify = (versions, range, options) => {
  const set = [];
  let first = null;
  let prev = null;
  const v = versions.sort(((a, b) => compare$2(a, b, options)));
  for (const version of v) {
    const included = satisfies$2(version, range, options);
    if (included) {
      prev = version;
      if (!first) {
        first = version;
      }
    } else {
      if (prev) {
        set.push([ first, prev ]);
      }
      prev = null;
      first = null;
    }
  }
  if (first) {
    set.push([ first, null ]);
  }
  const ranges = [];
  for (const [min, max] of set) {
    if (min === max) {
      ranges.push(min);
    } else if (!max && min === v[0]) {
      ranges.push('*');
    } else if (!max) {
      ranges.push(`>=${min}`);
    } else if (min === v[0]) {
      ranges.push(`<=${max}`);
    } else {
      ranges.push(`${min} - ${max}`);
    }
  }
  const simplified = ranges.join(' || ');
  const original = typeof range.raw === 'string' ? range.raw : String(range);
  return simplified.length < original.length ? simplified : range;
};

const Range$2 = requireRange();

const Comparator$1 = requireComparator();

const {ANY: ANY} = Comparator$1;

const satisfies$1 = satisfies_1;

const compare$1 = compare_1;

const subset$1 = (sub, dom, options = {}) => {
  if (sub === dom) {
    return true;
  }
  sub = new Range$2(sub, options);
  dom = new Range$2(dom, options);
  let sawNonNull = false;
  OUTER: for (const simpleSub of sub.set) {
    for (const simpleDom of dom.set) {
      const isSub = simpleSubset(simpleSub, simpleDom, options);
      sawNonNull = sawNonNull || isSub !== null;
      if (isSub) {
        continue OUTER;
      }
    }
    if (sawNonNull) {
      return false;
    }
  }
  return true;
};

const minimumVersionWithPreRelease = [ new Comparator$1('>=0.0.0-0') ];

const minimumVersion = [ new Comparator$1('>=0.0.0') ];

const simpleSubset = (sub, dom, options) => {
  if (sub === dom) {
    return true;
  }
  if (sub.length === 1 && sub[0].semver === ANY) {
    if (dom.length === 1 && dom[0].semver === ANY) {
      return true;
    } else if (options.includePrerelease) {
      sub = minimumVersionWithPreRelease;
    } else {
      sub = minimumVersion;
    }
  }
  if (dom.length === 1 && dom[0].semver === ANY) {
    if (options.includePrerelease) {
      return true;
    } else {
      dom = minimumVersion;
    }
  }
  const eqSet = new Set;
  let gt, lt;
  for (const c of sub) {
    if (c.operator === '>' || c.operator === '>=') {
      gt = higherGT(gt, c, options);
    } else if (c.operator === '<' || c.operator === '<=') {
      lt = lowerLT(lt, c, options);
    } else {
      eqSet.add(c.semver);
    }
  }
  if (eqSet.size > 1) {
    return null;
  }
  let gtltComp;
  if (gt && lt) {
    gtltComp = compare$1(gt.semver, lt.semver, options);
    if (gtltComp > 0) {
      return null;
    } else if (gtltComp === 0 && (gt.operator !== '>=' || lt.operator !== '<=')) {
      return null;
    }
  }
  for (const eq of eqSet) {
    if (gt && !satisfies$1(eq, String(gt), options)) {
      return null;
    }
    if (lt && !satisfies$1(eq, String(lt), options)) {
      return null;
    }
    for (const c of dom) {
      if (!satisfies$1(eq, String(c), options)) {
        return false;
      }
    }
    return true;
  }
  let higher, lower;
  let hasDomLT, hasDomGT;
  let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
  let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
  if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === '<' && needDomLTPre.prerelease[0] === 0) {
    needDomLTPre = false;
  }
  for (const c of dom) {
    hasDomGT = hasDomGT || c.operator === '>' || c.operator === '>=';
    hasDomLT = hasDomLT || c.operator === '<' || c.operator === '<=';
    if (gt) {
      if (needDomGTPre) {
        if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
          needDomGTPre = false;
        }
      }
      if (c.operator === '>' || c.operator === '>=') {
        higher = higherGT(gt, c, options);
        if (higher === c && higher !== gt) {
          return false;
        }
      } else if (gt.operator === '>=' && !satisfies$1(gt.semver, String(c), options)) {
        return false;
      }
    }
    if (lt) {
      if (needDomLTPre) {
        if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
          needDomLTPre = false;
        }
      }
      if (c.operator === '<' || c.operator === '<=') {
        lower = lowerLT(lt, c, options);
        if (lower === c && lower !== lt) {
          return false;
        }
      } else if (lt.operator === '<=' && !satisfies$1(lt.semver, String(c), options)) {
        return false;
      }
    }
    if (!c.operator && (lt || gt) && gtltComp !== 0) {
      return false;
    }
  }
  if (gt && hasDomLT && !lt && gtltComp !== 0) {
    return false;
  }
  if (lt && hasDomGT && !gt && gtltComp !== 0) {
    return false;
  }
  if (needDomGTPre || needDomLTPre) {
    return false;
  }
  return true;
};

const higherGT = (a, b, options) => {
  if (!a) {
    return b;
  }
  const comp = compare$1(a.semver, b.semver, options);
  return comp > 0 ? a : comp < 0 ? b : b.operator === '>' && a.operator === '>=' ? b : a;
};

const lowerLT = (a, b, options) => {
  if (!a) {
    return b;
  }
  const comp = compare$1(a.semver, b.semver, options);
  return comp < 0 ? a : comp > 0 ? b : b.operator === '<' && a.operator === '<=' ? b : a;
};

var subset_1 = subset$1;

const internalRe = reExports;

const constants = constants$1;

const SemVer = semver$2;

const identifiers = identifiers$1;

const parse = parse_1;

const valid = valid_1;

const clean = clean_1;

const inc = inc_1;

const diff = diff_1;

const major = major_1;

const minor = minor_1;

const patch = patch_1;

const prerelease = prerelease_1;

const compare = compare_1;

const rcompare = rcompare_1;

const compareLoose = compareLoose_1;

const compareBuild = compareBuild_1;

const sort = sort_1;

const rsort = rsort_1;

const gt = gt_1;

const lt = lt_1;

const eq = eq_1;

const neq = neq_1;

const gte = gte_1;

const lte = lte_1;

const cmp = cmp_1;

const coerce = coerce_1;

const Comparator = requireComparator();

const Range$1 = requireRange();

const satisfies = satisfies_1;

const toComparators = toComparators_1;

const maxSatisfying = maxSatisfying_1;

const minSatisfying = minSatisfying_1;

const minVersion = minVersion_1;

const validRange = valid$1;

const outside = outside_1;

const gtr = gtr_1;

const ltr = ltr_1;

const intersects = intersects_1;

const simplifyRange = simplify;

const subset = subset_1;

var semver = {
  parse: parse,
  valid: valid,
  clean: clean,
  inc: inc,
  diff: diff,
  major: major,
  minor: minor,
  patch: patch,
  prerelease: prerelease,
  compare: compare,
  rcompare: rcompare,
  compareLoose: compareLoose,
  compareBuild: compareBuild,
  sort: sort,
  rsort: rsort,
  gt: gt,
  lt: lt,
  eq: eq,
  neq: neq,
  gte: gte,
  lte: lte,
  cmp: cmp,
  coerce: coerce,
  Comparator: Comparator,
  Range: Range$1,
  satisfies: satisfies,
  toComparators: toComparators,
  maxSatisfying: maxSatisfying,
  minSatisfying: minSatisfying,
  minVersion: minVersion,
  validRange: validRange,
  outside: outside,
  gtr: gtr,
  ltr: ltr,
  intersects: intersects,
  simplifyRange: simplifyRange,
  subset: subset,
  SemVer: SemVer,
  re: internalRe.re,
  src: internalRe.src,
  tokens: internalRe.t,
  SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
  RELEASE_TYPES: constants.RELEASE_TYPES,
  compareIdentifiers: identifiers.compareIdentifiers,
  rcompareIdentifiers: identifiers.rcompareIdentifiers
};

const semver$1 = getDefaultExportFromCjs(semver);

class API {
  static fromSimpleString(value) {
    return new API(value, value, value);
  }
  static fromVersionString(versionString) {
    let version = semver$1.valid(versionString);
    if (!version) {
      return new API('invalid version', '1.0.0', '1.0.0');
    }
    const index = versionString.indexOf('-');
    if (index >= 0) {
      version = version.substr(0, index);
    }
    return new API(versionString, version, versionString);
  }
  constructor(displayName, version, fullVersionString) {
    this.displayName = displayName;
    this.version = version;
    this.fullVersionString = fullVersionString;
  }
  eq(other) {
    return semver$1.eq(this.version, other.version);
  }
  gte(other) {
    return semver$1.gte(this.version, other.version);
  }
  lt(other) {
    return !this.gte(other);
  }
}

API.defaultVersion = API.fromSimpleString('1.0.0');

API.v300 = API.fromSimpleString('3.0.0');

API.v310 = API.fromSimpleString('3.1.0');

API.v314 = API.fromSimpleString('3.1.4');

API.v320 = API.fromSimpleString('3.2.0');

API.v333 = API.fromSimpleString('3.3.3');

API.v340 = API.fromSimpleString('3.4.0');

API.v345 = API.fromSimpleString('3.4.5');

API.v350 = API.fromSimpleString('3.5.0');

API.v380 = API.fromSimpleString('3.8.0');

API.v381 = API.fromSimpleString('3.8.1');

API.v390 = API.fromSimpleString('3.9.0');

API.v400 = API.fromSimpleString('4.0.0');

API.v401 = API.fromSimpleString('4.0.1');

API.v420 = API.fromSimpleString('4.2.0');

API.v430 = API.fromSimpleString('4.3.0');

API.v440 = API.fromSimpleString('4.4.0');

API.v460 = API.fromSimpleString('4.6.0');

API.v470 = API.fromSimpleString('4.7.0');

API.v480 = API.fromSimpleString('4.8.0');

API.v490 = API.fromSimpleString('4.9.0');

API.v500 = API.fromSimpleString('5.0.0');

API.v510 = API.fromSimpleString('5.1.0');

function equals$1(a, b, itemEquals = ((a, b) => a === b)) {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every(((x, i) => itemEquals(x, b[i])));
}

function coalesce(array) {
  return array.filter((e => !!e));
}

class Delayer {
  constructor(defaultDelay) {
    this.defaultDelay = defaultDelay;
    this.timeout = null;
    this.completionPromise = null;
    this.onSuccess = null;
    this.task = null;
  }
  trigger(task, delay = this.defaultDelay) {
    this.task = task;
    if (delay >= 0) {
      this.cancelTimeout();
    }
    if (!this.completionPromise) {
      this.completionPromise = new Promise((resolve => {
        this.onSuccess = resolve;
      })).then((() => {
        this.completionPromise = null;
        this.onSuccess = null;
        const result = this.task?.();
        this.task = null;
        return result;
      }));
    }
    if (delay >= 0 || this.timeout === null) {
      this.timeout = setTimeout((() => {
        this.timeout = null;
        this.onSuccess?.(undefined);
      }), delay >= 0 ? delay : this.defaultDelay);
    }
    return this.completionPromise;
  }
  cancelTimeout() {
    if (this.timeout !== null) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

function makeRandomHexString(length) {
  const chars = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f' ];
  let result = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(chars.length * Math.random());
    result += chars[idx];
  }
  return result;
}

const getRootTempDir = (() => {
  let dir;
  return () => {
    if (!dir) {
      const filename = `typescript-language-server${process.platform !== 'win32' && process.getuid ? process.getuid() : ''}`;
      dir = path__default.join(os.tmpdir(), filename);
    }
    if (!fs$l.existsSync(dir)) {
      fs$l.mkdirSync(dir);
    }
    return dir;
  };
})();

const getInstanceTempDir = (() => {
  let dir;
  return () => {
    dir ?? (dir = path__default.join(getRootTempDir(), makeRandomHexString(20)));
    if (!fs$l.existsSync(dir)) {
      fs$l.mkdirSync(dir);
    }
    return dir;
  };
})();

function getTempFile(prefix) {
  return path__default.join(getInstanceTempDir(), `${prefix}-${makeRandomHexString(20)}.tmp`);
}

function looksLikeAbsoluteWindowsPath(path) {
  return /^[a-zA-Z]:[/\\]/.test(path);
}

const onCaseInsensitiveFileSystem = (() => {
  let value;
  return () => {
    if (typeof value === 'undefined') {
      if (process.platform === 'win32') {
        value = true;
      } else if (process.platform !== 'darwin') {
        value = false;
      } else {
        const temp = getTempFile('typescript-case-check');
        fs$l.writeFileSync(temp, '');
        value = fs$l.existsSync(temp.toUpperCase());
      }
    }
    return value;
  };
})();

class ResourceMap {
  constructor(_normalizePath = ResourceMap.defaultPathNormalizer, config) {
    this._normalizePath = _normalizePath;
    this.config = config;
    this._map = new Map;
  }
  get size() {
    return this._map.size;
  }
  has(resource) {
    const file = this.toKey(resource);
    return !!file && this._map.has(file);
  }
  get(resource) {
    const file = this.toKey(resource);
    if (!file) {
      return undefined;
    }
    const entry = this._map.get(file);
    return entry ? entry.value : undefined;
  }
  set(resource, value) {
    const file = this.toKey(resource);
    if (!file) {
      return;
    }
    const entry = this._map.get(file);
    if (entry) {
      entry.value = value;
    } else {
      this._map.set(file, {
        resource: resource,
        value: value
      });
    }
  }
  delete(resource) {
    const file = this.toKey(resource);
    if (file) {
      this._map.delete(file);
    }
  }
  clear() {
    this._map.clear();
  }
  values() {
    return Array.from(this._map.values(), (x => x.value));
  }
  entries() {
    return this._map.values();
  }
  toKey(resource) {
    const key = this._normalizePath(resource);
    if (!key) {
      return key;
    }
    return this.isCaseInsensitivePath(key) ? key.toLowerCase() : key;
  }
  isCaseInsensitivePath(path) {
    if (looksLikeAbsoluteWindowsPath(path)) {
      return true;
    }
    return path[0] === '/' && this.config.onCaseInsensitiveFileSystem;
  }
}

ResourceMap.defaultPathNormalizer = resource => {
  if (resource.scheme === 'file') {
    return resource.fsPath;
  }
  return resource.toString(true);
};

function mode2ScriptKind(mode) {
  switch (mode) {
   case typescript:
    return 'TS';

   case typescriptreact:
    return 'TSX';

   case javascript:
    return 'JS';

   case javascriptreact:
    return 'JSX';
  }
  return undefined;
}

function getModeFromFileUri(uri) {
  const extension = extname(uri).toUpperCase();
  switch (extension) {
   case '.TS':
    return typescript;

   case '.TSX':
    return typescriptreact;

   case '.JS':
    return javascript;

   case '.JSX':
    return javascriptreact;
  }
  return undefined;
}

class PendingDiagnostics extends ResourceMap {
  getOrderedFileSet() {
    const orderedResources = Array.from(this.entries()).sort(((a, b) => a.value - b.value)).map((entry => entry.resource));
    const map = new ResourceMap(this._normalizePath, this.config);
    for (const resource of orderedResources) {
      map.set(resource, undefined);
    }
    return map;
  }
}

class GetErrRequest {
  static executeGetErrRequest(client, files, onDone) {
    return new GetErrRequest(client, files, onDone);
  }
  constructor(client, files, onDone) {
    this.client = client;
    this.files = files;
    this._done = false;
    this._token = new main$3.CancellationTokenSource;
    if (!this.isErrorReportingEnabled()) {
      this._done = true;
      setImmediate(onDone);
      return;
    }
    const supportsSyntaxGetErr = this.client.apiVersion.gte(API.v440);
    const allFiles = coalesce(Array.from(files.entries()).filter((entry => supportsSyntaxGetErr || client.hasCapabilityForResource(entry.resource, ClientCapability.Semantic))).map((entry => client.toTsFilePath(entry.resource.toString()))));
    if (!allFiles.length) {
      this._done = true;
      setImmediate(onDone);
    } else {
      const request = this.areProjectDiagnosticsEnabled() ? client.executeAsync(CommandTypes.GeterrForProject, {
        delay: 0,
        file: allFiles[0]
      }, this._token.token) : client.executeAsync(CommandTypes.Geterr, {
        delay: 0,
        files: allFiles
      }, this._token.token);
      request.finally((() => {
        if (this._done) {
          return;
        }
        this._done = true;
        onDone();
      }));
    }
  }
  isErrorReportingEnabled() {
    if (this.client.apiVersion.gte(API.v440)) {
      return true;
    } else {
      return this.client.capabilities.has(ClientCapability.Semantic);
    }
  }
  areProjectDiagnosticsEnabled() {
    return false;
  }
  cancel() {
    if (!this._done) {
      this._token.cancel();
    }
    this._token.dispose();
  }
}

class LspDocument {
  constructor(doc, filepath) {
    const {uri: uri, languageId: languageId, version: version, text: text} = doc;
    this._document = TextDocument.create(uri, languageId, version, text);
    this._uri = URI.parse(uri);
    this._filepath = filepath;
  }
  get uri() {
    return this._uri;
  }
  get filepath() {
    return this._filepath;
  }
  get languageId() {
    return this._document.languageId;
  }
  get version() {
    return this._document.version;
  }
  getText(range) {
    return this._document.getText(range);
  }
  positionAt(offset) {
    return this._document.positionAt(offset);
  }
  offsetAt(position) {
    return this._document.offsetAt(position);
  }
  get lineCount() {
    return this._document.lineCount;
  }
  getLine(line) {
    const lineRange = this.getLineRange(line);
    return this.getText(lineRange);
  }
  getLineRange(line) {
    const lineStart = this.getLineStart(line);
    const lineEnd = this.getLineEnd(line);
    return main$3.Range.create(lineStart, lineEnd);
  }
  getLineEnd(line) {
    const nextLine = line + 1;
    const nextLineOffset = this.getLineOffset(nextLine);
    return this.positionAt(nextLine < this._document.lineCount ? nextLineOffset - 1 : nextLineOffset);
  }
  getLineOffset(line) {
    const lineStart = this.getLineStart(line);
    return this.offsetAt(lineStart);
  }
  getLineStart(line) {
    return main$3.Position.create(line, 0);
  }
  getFullRange() {
    return main$3.Range.create(main$3.Position.create(0, 0), this.getLineEnd(Math.max(this.lineCount - 1, 0)));
  }
  applyEdit(version, change) {
    const content = this.getText();
    let newContent = change.text;
    if (main$3.TextDocumentContentChangeEvent.isIncremental(change)) {
      const start = this.offsetAt(change.range.start);
      const end = this.offsetAt(change.range.end);
      newContent = content.substr(0, start) + change.text + content.substr(end);
    }
    this._document = TextDocument.create(this._uri.toString(), this.languageId, version, newContent);
  }
}

class LspDocuments {
  constructor(client, lspClient, onCaseInsensitiveFileSystem) {
    this._validateJavaScript = true;
    this._validateTypeScript = true;
    this.modeIds = new Set;
    this._files = [];
    this.documents = new Map;
    this.client = client;
    this.lspClient = lspClient;
    const pathNormalizer = path => this.client.toTsFilePath(path.toString());
    this.pendingDiagnostics = new PendingDiagnostics(pathNormalizer, {
      onCaseInsensitiveFileSystem: onCaseInsensitiveFileSystem
    });
    this.diagnosticDelayer = new Delayer(300);
  }
  initialize(allModeIds) {
    this.modeIds = new Set(allModeIds);
  }
  get files() {
    return this._files;
  }
  get documentsForTesting() {
    return this.documents;
  }
  get(file) {
    const document = this.documents.get(file);
    if (!document) {
      return undefined;
    }
    if (this.files[0] !== file) {
      this._files.splice(this._files.indexOf(file), 1);
      this._files.unshift(file);
    }
    return document;
  }
  openTextDocument(textDocument) {
    if (!this.modeIds.has(textDocument.languageId)) {
      const detectedLanguageId = getModeFromFileUri(textDocument.uri);
      if (detectedLanguageId) {
        this.lspClient.logMessage({
          type: main$3.MessageType.Warning,
          message: `Invalid langaugeId "${textDocument.languageId}" provided for uri "${textDocument.uri}". Correcting to "${detectedLanguageId}"`
        });
        textDocument.languageId = detectedLanguageId;
      } else {
        return false;
      }
    }
    const resource = textDocument.uri;
    const filepath = this.client.toTsFilePath(resource);
    if (!filepath) {
      return false;
    }
    if (this.documents.has(filepath)) {
      return true;
    }
    const document = new LspDocument(textDocument, filepath);
    this.documents.set(filepath, document);
    this._files.unshift(filepath);
    this.client.executeWithoutWaitingForResponse(CommandTypes.Open, {
      file: filepath,
      fileContent: textDocument.text,
      scriptKindName: mode2ScriptKind(textDocument.languageId),
      projectRootPath: this.getProjectRootPath(document.uri)
    });
    this.requestDiagnostic(document);
    return true;
  }
  onDidCloseTextDocument(uri) {
    const document = this.client.toOpenDocument(uri);
    if (!document) {
      return;
    }
    this._files.splice(this._files.indexOf(document.filepath), 1);
    this.pendingDiagnostics.delete(document.uri);
    this.pendingGetErr?.files.delete(document.uri);
    this.documents.delete(document.filepath);
    this.client.cancelInflightRequestsForResource(document.uri);
    this.client.executeWithoutWaitingForResponse(CommandTypes.Close, {
      file: document.filepath
    });
    this.requestAllDiagnostics();
  }
  requestDiagnosticsForTesting() {
    this.triggerDiagnostics(0);
  }
  onDidChangeTextDocument(params) {
    const {textDocument: textDocument} = params;
    if (textDocument.version === null) {
      throw new Error(`Received document change event for ${textDocument.uri} without valid version identifier`);
    }
    const filepath = this.client.toTsFilePath(textDocument.uri);
    if (!filepath) {
      return;
    }
    const document = this.documents.get(filepath);
    if (!document) {
      return;
    }
    this.client.cancelInflightRequestsForResource(document.uri);
    for (const change of params.contentChanges) {
      let line = 0;
      let offset = 0;
      let endLine = 0;
      let endOffset = 0;
      if (main$3.TextDocumentContentChangeEvent.isIncremental(change)) {
        line = change.range.start.line + 1;
        offset = change.range.start.character + 1;
        endLine = change.range.end.line + 1;
        endOffset = change.range.end.character + 1;
      } else {
        line = 1;
        offset = 1;
        const endPos = document.positionAt(document.getText().length);
        endLine = endPos.line + 1;
        endOffset = endPos.character + 1;
      }
      this.client.executeWithoutWaitingForResponse(CommandTypes.Change, {
        file: filepath,
        line: line,
        offset: offset,
        endLine: endLine,
        endOffset: endOffset,
        insertString: change.text
      });
      document.applyEdit(textDocument.version, change);
    }
    const didTrigger = this.requestDiagnostic(document);
    if (!didTrigger && this.pendingGetErr) {
      this.pendingGetErr.cancel();
      this.pendingGetErr = undefined;
      this.triggerDiagnostics();
    }
  }
  interruptGetErr(f) {
    if (!this.pendingGetErr) {
      return f();
    }
    this.pendingGetErr.cancel();
    this.pendingGetErr = undefined;
    const result = f();
    this.triggerDiagnostics();
    return result;
  }
  getProjectRootPath(resource) {
    const workspaceRoot = this.client.getWorkspaceRootForResource(resource);
    if (workspaceRoot) {
      return this.client.toTsFilePath(workspaceRoot.toString());
    }
    return undefined;
  }
  handles(resource) {
    const filepath = this.client.toTsFilePath(resource.toString());
    return filepath !== undefined && this.documents.has(filepath);
  }
  requestAllDiagnostics() {
    for (const buffer of this.documents.values()) {
      if (this.shouldValidate(buffer)) {
        this.pendingDiagnostics.set(buffer.uri, Date.now());
      }
    }
    this.triggerDiagnostics();
  }
  hasPendingDiagnostics(resource) {
    return this.pendingDiagnostics.has(resource);
  }
  getErr(resources) {
    const handledResources = resources.filter((resource => this.handles(resource)));
    if (!handledResources.length) {
      return;
    }
    for (const resource of handledResources) {
      this.pendingDiagnostics.set(resource, Date.now());
    }
    this.triggerDiagnostics();
  }
  triggerDiagnostics(delay = 200) {
    this.diagnosticDelayer.trigger((() => {
      this.sendPendingDiagnostics();
    }), delay);
  }
  requestDiagnostic(buffer) {
    if (!this.shouldValidate(buffer)) {
      return false;
    }
    this.pendingDiagnostics.set(buffer.uri, Date.now());
    const delay = Math.min(Math.max(Math.ceil(buffer.lineCount / 20), 300), 800);
    this.triggerDiagnostics(delay);
    return true;
  }
  sendPendingDiagnostics() {
    const orderedFileSet = this.pendingDiagnostics.getOrderedFileSet();
    if (this.pendingGetErr) {
      this.pendingGetErr.cancel();
      for (const {resource: resource} of this.pendingGetErr.files.entries()) {
        const filename = this.client.toTsFilePath(resource.toString());
        if (filename && this.documents.get(filename)) {
          orderedFileSet.set(resource, undefined);
        }
      }
      this.pendingGetErr = undefined;
    }
    for (const buffer of this.documents.values()) {
      orderedFileSet.set(buffer.uri, undefined);
    }
    if (orderedFileSet.size) {
      const getErr = this.pendingGetErr = GetErrRequest.executeGetErrRequest(this.client, orderedFileSet, (() => {
        if (this.pendingGetErr === getErr) {
          this.pendingGetErr = undefined;
        }
      }));
    }
    this.pendingDiagnostics.clear();
  }
  shouldValidate(buffer) {
    switch (buffer.languageId) {
     case 'javascript':
     case 'javascriptreact':
      return this._validateJavaScript;

     case 'typescript':
     case 'typescriptreact':
     default:
      return this._validateTypeScript;
    }
  }
}

const file = 'file';

const untitled = 'untitled';

const git = 'git';

const github = 'github';

const azurerepos = 'azurerepos';

const buffer = 'buffer';

const zipfile = 'zipfile';

const vsls = 'vsls';

function getSemanticSupportedSchemes() {
  return [ file, untitled, buffer, zipfile ];
}

const disabledSchemes = new Set([ git, vsls, github, azurerepos ]);

var TypeScriptServerPlugin;

(function(TypeScriptServerPlugin) {
  function equals(a, b) {
    return a.uri.toString() === b.uri.toString() && a.name === b.name && equals$1(a.languages, b.languages);
  }
  TypeScriptServerPlugin.equals = equals;
})(TypeScriptServerPlugin || (TypeScriptServerPlugin = {}));

class PluginManager {
  setPlugins(plugins) {
    this._plugins = this.readPlugins(plugins);
  }
  get plugins() {
    return Array.from(this._plugins || []);
  }
  readPlugins(plugins) {
    const newPlugins = [];
    for (const plugin of plugins) {
      newPlugins.push({
        name: plugin.name,
        uri: URI.file(plugin.location),
        languages: Array.isArray(plugin.languages) ? plugin.languages : []
      });
    }
    return newPlugins;
  }
}

class TypeScriptServerError extends Error {
  static create(serverId, version, response) {
    const parsedResult = TypeScriptServerError.parseErrorText(response);
    return new TypeScriptServerError(serverId, version, response, parsedResult?.message, parsedResult?.stack);
  }
  constructor(serverId, version, response, serverMessage, serverStack) {
    super(`<${serverId}> TypeScript Server Error (${version.versionString})\n${serverMessage}\n${serverStack}`);
    this.serverId = serverId;
    this.version = version;
    this.response = response;
    this.serverMessage = serverMessage;
    this.serverStack = serverStack;
  }
  get serverErrorText() {
    return this.response.message;
  }
  get serverCommand() {
    return this.response.command;
  }
  static parseErrorText(response) {
    const errorText = response.message;
    if (errorText) {
      const errorPrefix = 'Error processing request. ';
      if (errorText.startsWith(errorPrefix)) {
        const prefixFreeErrorText = errorText.substr(errorPrefix.length);
        const newlineIndex = prefixFreeErrorText.indexOf('\n');
        if (newlineIndex >= 0) {
          const stack = prefixFreeErrorText.substring(newlineIndex + 1);
          return {
            message: prefixFreeErrorText.substring(0, newlineIndex),
            stack: stack
          };
        }
      }
    }
    return undefined;
  }
}

const randomBytesAsync = promisify(crypto.randomBytes);

const urlSafeCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~'.split('');

const numericCharacters = '0123456789'.split('');

const distinguishableCharacters = 'CDEHKMPRTUWXY012458'.split('');

const asciiPrintableCharacters = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'.split('');

const alphanumericCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');

const generateForCustomCharacters = (length, characters) => {
  const characterCount = characters.length;
  const maxValidSelector = Math.floor(65536 / characterCount) * characterCount - 1;
  const entropyLength = 2 * Math.ceil(1.1 * length);
  let string = '';
  let stringLength = 0;
  while (stringLength < length) {
    const entropy = crypto.randomBytes(entropyLength);
    let entropyPosition = 0;
    while (entropyPosition < entropyLength && stringLength < length) {
      const entropyValue = entropy.readUInt16LE(entropyPosition);
      entropyPosition += 2;
      if (entropyValue > maxValidSelector) {
        continue;
      }
      string += characters[entropyValue % characterCount];
      stringLength++;
    }
  }
  return string;
};

const generateForCustomCharactersAsync = async (length, characters) => {
  const characterCount = characters.length;
  const maxValidSelector = Math.floor(65536 / characterCount) * characterCount - 1;
  const entropyLength = 2 * Math.ceil(1.1 * length);
  let string = '';
  let stringLength = 0;
  while (stringLength < length) {
    const entropy = await randomBytesAsync(entropyLength);
    let entropyPosition = 0;
    while (entropyPosition < entropyLength && stringLength < length) {
      const entropyValue = entropy.readUInt16LE(entropyPosition);
      entropyPosition += 2;
      if (entropyValue > maxValidSelector) {
        continue;
      }
      string += characters[entropyValue % characterCount];
      stringLength++;
    }
  }
  return string;
};

const generateRandomBytes = (byteLength, type, length) => crypto.randomBytes(byteLength).toString(type).slice(0, length);

const generateRandomBytesAsync = async (byteLength, type, length) => {
  const buffer = await randomBytesAsync(byteLength);
  return buffer.toString(type).slice(0, length);
};

const allowedTypes = new Set([ undefined, 'hex', 'base64', 'url-safe', 'numeric', 'distinguishable', 'ascii-printable', 'alphanumeric' ]);

const createGenerator = (generateForCustomCharacters, generateRandomBytes) => ({length: length, type: type, characters: characters}) => {
  if (!(length >= 0 && Number.isFinite(length))) {
    throw new TypeError('Expected a `length` to be a non-negative finite number');
  }
  if (type !== undefined && characters !== undefined) {
    throw new TypeError('Expected either `type` or `characters`');
  }
  if (characters !== undefined && typeof characters !== 'string') {
    throw new TypeError('Expected `characters` to be string');
  }
  if (!allowedTypes.has(type)) {
    throw new TypeError(`Unknown type: ${type}`);
  }
  if (type === undefined && characters === undefined) {
    type = 'hex';
  }
  if (type === 'hex' || type === undefined && characters === undefined) {
    return generateRandomBytes(Math.ceil(length * .5), 'hex', length);
  }
  if (type === 'base64') {
    return generateRandomBytes(Math.ceil(length * .75), 'base64', length);
  }
  if (type === 'url-safe') {
    return generateForCustomCharacters(length, urlSafeCharacters);
  }
  if (type === 'numeric') {
    return generateForCustomCharacters(length, numericCharacters);
  }
  if (type === 'distinguishable') {
    return generateForCustomCharacters(length, distinguishableCharacters);
  }
  if (type === 'ascii-printable') {
    return generateForCustomCharacters(length, asciiPrintableCharacters);
  }
  if (type === 'alphanumeric') {
    return generateForCustomCharacters(length, alphanumericCharacters);
  }
  if (characters.length === 0) {
    throw new TypeError('Expected `characters` string length to be greater than or equal to 1');
  }
  if (characters.length > 65536) {
    throw new TypeError('Expected `characters` string length to be less or equal to 65536');
  }
  return generateForCustomCharacters(length, characters.split(''));
};

const cryptoRandomString = createGenerator(generateForCustomCharacters, generateRandomBytes);

cryptoRandomString.async = createGenerator(generateForCustomCharactersAsync, generateRandomBytesAsync);

function uniqueString() {
  return cryptoRandomString({
    length: 32
  });
}

const temporaryDirectory$1 = await promises.realpath(os.tmpdir());

promisify$1(stream.pipeline);

const getPath = (prefix = '') => path__default.join(temporaryDirectory$1, prefix + uniqueString());

function temporaryFile({name: name, extension: extension} = {}) {
  if (name) {
    if (extension !== undefined && extension !== null) {
      throw new Error('The `name` and `extension` options are mutually exclusive');
    }
    return path__default.join(temporaryDirectory(), name);
  }
  return getPath() + (extension === undefined || extension === null ? '' : '.' + extension.replace(/^\./, ''));
}

function temporaryDirectory({prefix: prefix = ''} = {}) {
  const directory = getPath(prefix);
  fs$l.mkdirSync(directory);
  return directory;
}

class NodeRequestCanceller {
  constructor(_serverId, _tracer) {
    this._serverId = _serverId;
    this._tracer = _tracer;
    this.cancellationPipeName = temporaryFile({
      name: 'tscancellation'
    });
  }
  tryCancelOngoingRequest(seq) {
    if (!this.cancellationPipeName) {
      return false;
    }
    this._tracer.logTrace(this._serverId, `TypeScript Server: trying to cancel ongoing request with sequence number ${seq}`);
    try {
      fs$l.writeFileSync(this.cancellationPipeName + String(seq), '');
    } catch {}
    return true;
  }
}

const nodeRequestCancellerFactory = new class {
  create(serverId, tracer) {
    return new NodeRequestCanceller(serverId, tracer);
  }
};

var RequestQueueingType;

(function(RequestQueueingType) {
  RequestQueueingType[RequestQueueingType['Normal'] = 1] = 'Normal';
  RequestQueueingType[RequestQueueingType['LowPriority'] = 2] = 'LowPriority';
  RequestQueueingType[RequestQueueingType['Fence'] = 3] = 'Fence';
})(RequestQueueingType || (RequestQueueingType = {}));

class RequestQueue {
  constructor() {
    this.queue = [];
    this.sequenceNumber = 0;
  }
  get length() {
    return this.queue.length;
  }
  enqueue(item) {
    if (item.queueingType === RequestQueueingType.Normal) {
      let index = this.queue.length - 1;
      while (index >= 0) {
        if (this.queue[index].queueingType !== RequestQueueingType.LowPriority) {
          break;
        }
        --index;
      }
      this.queue.splice(index + 1, 0, item);
    } else {
      this.queue.push(item);
    }
  }
  dequeue() {
    return this.queue.shift();
  }
  tryDeletePendingRequest(seq) {
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].request.seq === seq) {
        this.queue.splice(i, 1);
        return true;
      }
    }
    return false;
  }
  createRequest(command, args) {
    return {
      seq: this.sequenceNumber++,
      type: 'request',
      command: command,
      arguments: args
    };
  }
}

class CallbackMap {
  constructor() {
    this._callbacks = new Map;
    this._asyncCallbacks = new Map;
  }
  destroy(cause) {
    const cancellation = new ServerResponse.Cancelled(cause);
    for (const callback of this._callbacks.values()) {
      callback.onSuccess(cancellation);
    }
    this._callbacks.clear();
    for (const callback of this._asyncCallbacks.values()) {
      callback.onSuccess(cancellation);
    }
    this._asyncCallbacks.clear();
  }
  add(seq, callback, isAsync) {
    if (isAsync) {
      this._asyncCallbacks.set(seq, callback);
    } else {
      this._callbacks.set(seq, callback);
    }
  }
  fetch(seq) {
    const callback = this._callbacks.get(seq) || this._asyncCallbacks.get(seq);
    this.delete(seq);
    return callback;
  }
  delete(seq) {
    if (!this._callbacks.delete(seq)) {
      this._asyncCallbacks.delete(seq);
    }
  }
}

var ExecutionTarget;

(function(ExecutionTarget) {
  ExecutionTarget[ExecutionTarget['Semantic'] = 0] = 'Semantic';
  ExecutionTarget[ExecutionTarget['Syntax'] = 1] = 'Syntax';
})(ExecutionTarget || (ExecutionTarget = {}));

class SingleTsServer {
  constructor(_serverId, _serverSource, _process, _tsServerLogFile, _requestCanceller, _version, _tracer) {
    this._serverId = _serverId;
    this._serverSource = _serverSource;
    this._process = _process;
    this._tsServerLogFile = _tsServerLogFile;
    this._requestCanceller = _requestCanceller;
    this._version = _version;
    this._tracer = _tracer;
    this._requestQueue = new RequestQueue;
    this._callbacks = new CallbackMap;
    this._pendingResponses = new Set;
    this._eventHandlers = new Set;
    this._exitHandlers = new Set;
    this._errorHandlers = new Set;
    this._stdErrHandlers = new Set;
    this._process.onData((msg => {
      this.dispatchMessage(msg);
    }));
    this._process.onStdErr((error => {
      this._stdErrHandlers.forEach((handler => handler(error)));
    }));
    this._process.onExit(((code, signal) => {
      this._exitHandlers.forEach((handler => handler({
        code: code,
        signal: signal
      })));
      this._callbacks.destroy('server exited');
    }));
    this._process.onError((error => {
      this._errorHandlers.forEach((handler => handler(error)));
      this._callbacks.destroy('server errored');
    }));
  }
  onEvent(handler) {
    this._eventHandlers.add(handler);
  }
  onExit(handler) {
    this._exitHandlers.add(handler);
  }
  onStdErr(handler) {
    this._stdErrHandlers.add(handler);
  }
  onError(handler) {
    this._errorHandlers.add(handler);
  }
  get tsServerLogFile() {
    return this._tsServerLogFile;
  }
  write(serverRequest) {
    this._process.write(serverRequest);
  }
  dispose() {
    this._callbacks.destroy('server disposed');
    this._pendingResponses.clear();
    this._eventHandlers.clear();
    this._exitHandlers.clear();
    this._errorHandlers.clear();
  }
  kill() {
    this.dispose();
    this._process.kill();
  }
  dispatchMessage(message) {
    try {
      switch (message.type) {
       case 'response':
        if (this._serverSource) {
          this.dispatchResponse({
            ...message
          });
        } else {
          this.dispatchResponse(message);
        }
        break;

       case 'event':
        {
          const event = message;
          if (event.event === 'requestCompleted') {
            const seq = event.body.request_seq;
            const callback = this._callbacks.fetch(seq);
            if (callback) {
              this._tracer.traceRequestCompleted(this._serverId, 'requestCompleted', seq, callback);
              callback.onSuccess(undefined);
            }
          } else {
            this._tracer.traceEvent(this._serverId, event);
            this._eventHandlers.forEach((handler => handler(event)));
          }
          break;
        }

       default:
        throw new Error(`Unknown message type ${message.type} received`);
      }
    } finally {
      this.sendNextRequests();
    }
  }
  tryCancelRequest(seq, command) {
    try {
      if (this._requestQueue.tryDeletePendingRequest(seq)) {
        this.logTrace(`Canceled request with sequence number ${seq}`);
        return true;
      }
      if (this._requestCanceller.tryCancelOngoingRequest(seq)) {
        return true;
      }
      this.logTrace(`Tried to cancel request with sequence number ${seq}. But request got already delivered.`);
      return false;
    } finally {
      const callback = this.fetchCallback(seq);
      callback?.onSuccess(new ServerResponse.Cancelled(`Cancelled request ${seq} - ${command}`));
    }
  }
  dispatchResponse(response) {
    const callback = this.fetchCallback(response.request_seq);
    if (!callback) {
      return;
    }
    this._tracer.traceResponse(this._serverId, response, callback);
    if (response.success) {
      callback.onSuccess(response);
    } else if (response.message === 'No content available.') {
      callback.onSuccess(ServerResponse.NoContent);
    } else {
      callback.onError(TypeScriptServerError.create(this._serverId, this._version, response));
    }
  }
  executeImpl(command, args, executeInfo) {
    const request = this._requestQueue.createRequest(command, args);
    const requestInfo = {
      request: request,
      expectsResponse: executeInfo.expectsResult,
      isAsync: executeInfo.isAsync,
      queueingType: SingleTsServer.getQueueingType(command, executeInfo.lowPriority)
    };
    let result;
    if (executeInfo.expectsResult) {
      result = new Promise(((resolve, reject) => {
        this._callbacks.add(request.seq, {
          onSuccess: resolve,
          onError: reject,
          queuingStartTime: Date.now(),
          isAsync: executeInfo.isAsync
        }, executeInfo.isAsync);
        if (executeInfo.token) {
          executeInfo.token.onCancellationRequested((() => {
            this.tryCancelRequest(request.seq, command);
          }));
        }
      }));
    }
    this._requestQueue.enqueue(requestInfo);
    this.sendNextRequests();
    return [ result ];
  }
  sendNextRequests() {
    while (this._pendingResponses.size === 0 && this._requestQueue.length > 0) {
      const item = this._requestQueue.dequeue();
      if (item) {
        this.sendRequest(item);
      }
    }
  }
  sendRequest(requestItem) {
    const serverRequest = requestItem.request;
    this._tracer.traceRequest(this._serverId, serverRequest, requestItem.expectsResponse, this._requestQueue.length);
    if (requestItem.expectsResponse && !requestItem.isAsync) {
      this._pendingResponses.add(requestItem.request.seq);
    }
    try {
      this.write(serverRequest);
    } catch (err) {
      const callback = this.fetchCallback(serverRequest.seq);
      callback?.onError(err);
    }
  }
  fetchCallback(seq) {
    const callback = this._callbacks.fetch(seq);
    if (!callback) {
      return undefined;
    }
    this._pendingResponses.delete(seq);
    return callback;
  }
  logTrace(message) {
    this._tracer.logTrace(this._serverId, message);
  }
  static getQueueingType(command, lowPriority) {
    if (SingleTsServer.fenceCommands.has(command)) {
      return RequestQueueingType.Fence;
    }
    return lowPriority ? RequestQueueingType.LowPriority : RequestQueueingType.Normal;
  }
}

SingleTsServer.fenceCommands = new Set([ 'change', 'close', 'open', 'updateOpen' ]);

class RequestRouter {
  constructor(servers, delegate) {
    this.servers = servers;
    this.delegate = delegate;
  }
  execute(command, args, executeInfo) {
    if (RequestRouter.sharedCommands.has(command) && typeof executeInfo.executionTarget === 'undefined') {
      const requestStates = this.servers.map((() => RequestState.Unresolved));
      let token = undefined;
      if (executeInfo.token) {
        const source = new main$3.CancellationTokenSource;
        executeInfo.token.onCancellationRequested((() => {
          if (requestStates.some((state => state === RequestState.Resolved))) {
            return;
          }
          source.cancel();
        }));
        token = source.token;
      }
      const allRequests = [];
      for (let serverIndex = 0; serverIndex < this.servers.length; ++serverIndex) {
        const server = this.servers[serverIndex].server;
        const request = server.executeImpl(command, args, {
          ...executeInfo,
          token: token
        })[0];
        allRequests.push(request);
        if (request) {
          request.then((result => {
            requestStates[serverIndex] = RequestState.Resolved;
            const erroredRequest = requestStates.find((state => state.type === 2));
            if (erroredRequest) {
              this.delegate.onFatalError(command, erroredRequest.err);
            }
            return result;
          }), (err => {
            requestStates[serverIndex] = new RequestState.Errored(err);
            if (requestStates.some((state => state === RequestState.Resolved))) {
              this.delegate.onFatalError(command, err);
            }
            throw err;
          }));
        }
      }
      return allRequests;
    }
    for (const {canRun: canRun, server: server} of this.servers) {
      if (!canRun || canRun(command, executeInfo)) {
        return server.executeImpl(command, args, executeInfo);
      }
    }
    throw new Error(`Could not find server for command: '${command}'`);
  }
}

RequestRouter.sharedCommands = new Set([ CommandTypes.Change, CommandTypes.Close, CommandTypes.Open, CommandTypes.UpdateOpen, CommandTypes.Configure ]);

class SyntaxRoutingTsServer {
  constructor(servers, delegate, enableDynamicRouting) {
    this._projectLoading = true;
    this._eventHandlers = new Set;
    this._exitHandlers = new Set;
    this._errorHandlers = new Set;
    this.syntaxServer = servers.syntax;
    this.semanticServer = servers.semantic;
    this.router = new RequestRouter([ {
      server: this.syntaxServer,
      canRun: (command, execInfo) => {
        switch (execInfo.executionTarget) {
         case ExecutionTarget.Semantic:
          return false;

         case ExecutionTarget.Syntax:
          return true;
        }
        if (SyntaxRoutingTsServer.syntaxAlwaysCommands.has(command)) {
          return true;
        }
        if (SyntaxRoutingTsServer.semanticCommands.has(command)) {
          return false;
        }
        if (enableDynamicRouting && this.projectLoading && SyntaxRoutingTsServer.syntaxAllowedCommands.has(command)) {
          return true;
        }
        return false;
      }
    }, {
      server: this.semanticServer,
      canRun: undefined
    } ], delegate);
    this.syntaxServer.onEvent((event => {
      this._eventHandlers.forEach((handler => handler(event)));
    }));
    this.semanticServer.onEvent((event => {
      switch (event.event) {
       case 'projectLoadingStart':
        this._projectLoading = true;
        break;

       case 'projectLoadingFinish':
       case 'semanticDiag':
       case 'syntaxDiag':
       case 'suggestionDiag':
       case 'configFileDiag':
        this._projectLoading = false;
        break;
      }
      this._eventHandlers.forEach((handler => handler(event)));
    }));
    this.semanticServer.onExit((event => {
      this._exitHandlers.forEach((handler => handler(event)));
      this.syntaxServer.kill();
    }));
    this.semanticServer.onError((event => this._errorHandlers.forEach((handler => handler(event)))));
  }
  get projectLoading() {
    return this._projectLoading;
  }
  dispose() {
    this._eventHandlers.clear();
    this._exitHandlers.clear();
    this._errorHandlers.clear();
  }
  onEvent(handler) {
    this._eventHandlers.add(handler);
  }
  onExit(handler) {
    this._exitHandlers.add(handler);
  }
  onError(handler) {
    this._errorHandlers.add(handler);
  }
  onStdErr(_handler) {}
  get tsServerLogFile() {
    return this.semanticServer.tsServerLogFile;
  }
  kill() {
    this.dispose();
    this.syntaxServer.kill();
    this.semanticServer.kill();
  }
  executeImpl(command, args, executeInfo) {
    return this.router.execute(command, args, executeInfo);
  }
}

SyntaxRoutingTsServer.syntaxAlwaysCommands = new Set([ CommandTypes.NavTree, CommandTypes.GetOutliningSpans, CommandTypes.JsxClosingTag, CommandTypes.SelectionRange, CommandTypes.Format, CommandTypes.Formatonkey, CommandTypes.DocCommentTemplate ]);

SyntaxRoutingTsServer.semanticCommands = new Set([ CommandTypes.Geterr, CommandTypes.GeterrForProject, CommandTypes.ProjectInfo, CommandTypes.ConfigurePlugin ]);

SyntaxRoutingTsServer.syntaxAllowedCommands = new Set([ CommandTypes.CompletionDetails, CommandTypes.CompletionInfo, CommandTypes.Definition, CommandTypes.DefinitionAndBoundSpan, CommandTypes.DocumentHighlights, CommandTypes.Implementation, CommandTypes.Navto, CommandTypes.Quickinfo, CommandTypes.References, CommandTypes.Rename, CommandTypes.SignatureHelp ]);

var RequestState;

(function(RequestState) {
  RequestState.Unresolved = {
    type: 0
  };
  RequestState.Resolved = {
    type: 1
  };
  class Errored {
    constructor(err) {
      this.err = err;
      this.type = 2;
    }
  }
  RequestState.Errored = Errored;
})(RequestState || (RequestState = {}));

class NodeTsServerProcessFactory {
  fork(version, args, kind, configuration) {
    const tsServerPath = version.tsServerPath;
    const useIpc = version.version?.gte(API.v490);
    const runtimeArgs = [ ...args ];
    if (useIpc) {
      runtimeArgs.push('--useNodeIpc');
    }
    const childProcess = ChildProcess.fork(tsServerPath, runtimeArgs, {
      silent: true,
      cwd: undefined,
      env: generatePatchedEnv(process.env, tsServerPath),
      execArgv: getExecArgv(kind, configuration),
      stdio: useIpc ? [ 'pipe', 'pipe', 'pipe', 'ipc' ] : undefined
    });
    return useIpc ? new IpcChildServerProcess(childProcess) : new StdioChildServerProcess(childProcess);
  }
}

function generatePatchedEnv(env, modulePath) {
  const newEnv = Object.assign({}, env);
  newEnv.NODE_PATH = path__default.join(modulePath, '..', '..', '..');
  newEnv.PATH = newEnv.PATH || process.env.PATH;
  return newEnv;
}

function getExecArgv(kind, configuration) {
  const args = [];
  const debugPort = getDebugPort(kind);
  if (debugPort) {
    const inspectFlag = getTssDebugBrk() ? '--inspect-brk' : '--inspect';
    args.push(`${inspectFlag}=${debugPort}`);
  }
  if (configuration.maxTsServerMemory) {
    args.push(`--max-old-space-size=${configuration.maxTsServerMemory}`);
  }
  return args;
}

function getDebugPort(kind) {
  if (kind === 'syntax') {
    return undefined;
  }
  const value = getTssDebugBrk() || getTssDebug();
  if (value) {
    const port = parseInt(value);
    if (!isNaN(port)) {
      return port;
    }
  }
  return undefined;
}

function getTssDebug() {
  return process.env.TSS_DEBUG;
}

function getTssDebugBrk() {
  return process.env.TSS_DEBUG_BRK;
}

class IpcChildServerProcess {
  constructor(_process) {
    this._process = _process;
  }
  write(serverRequest) {
    this._process.send(serverRequest);
  }
  onData(handler) {
    this._process.on('message', handler);
  }
  onExit(handler) {
    this._process.on('exit', handler);
  }
  onStdErr(handler) {
    this._process.stderr.on('data', (data => handler(data.toString())));
  }
  onError(handler) {
    this._process.on('error', handler);
  }
  kill() {
    this._process.kill();
  }
}

class StdioChildServerProcess {
  constructor(_process) {
    this._process = _process;
    this._reader = new Reader(this._process.stdout);
  }
  get reader() {
    return this._reader;
  }
  write(serverRequest) {
    this._process.stdin.write(`${JSON.stringify(serverRequest)}\r\n`, 'utf8');
  }
  onData(handler) {
    this.reader.onData(handler);
  }
  onExit(handler) {
    this._process.on('exit', handler);
  }
  onStdErr(handler) {
    this._process.stderr.on('data', (data => handler(data.toString())));
  }
  onError(handler) {
    this._process.on('error', handler);
    this.reader.onError(handler);
  }
  kill() {
    this._process.kill();
    this.reader.dispose();
    this._reader = null;
  }
}

class Reader {
  constructor(readable) {
    this.buffer = new ProtocolBuffer;
    this.nextMessageLength = -1;
    this._onError = _error => {};
    this._onData = _data => {};
    this.isDisposed = false;
    readable.on('data', (data => this.onLengthData(data)));
  }
  dispose() {
    this.isDisposed = true;
    this._onError = _error => {};
    this._onData = _data => {};
  }
  onError(handler) {
    this._onError = handler;
  }
  onData(handler) {
    this._onData = handler;
  }
  onLengthData(data) {
    if (this.isDisposed) {
      return;
    }
    try {
      this.buffer.append(data);
      while (true) {
        if (this.nextMessageLength === -1) {
          this.nextMessageLength = this.buffer.tryReadContentLength();
          if (this.nextMessageLength === -1) {
            return;
          }
        }
        const msg = this.buffer.tryReadContent(this.nextMessageLength);
        if (msg === null) {
          return;
        }
        this.nextMessageLength = -1;
        const json = JSON.parse(msg);
        this._onData(json);
      }
    } catch (e) {
      this._onError(e);
    }
  }
}

const defaultSize = 8192;

const contentLength = 'Content-Length: ';

const contentLengthSize = Buffer.byteLength(contentLength, 'utf8');

const blank = Buffer.from(' ', 'utf8')[0];

const backslashR = Buffer.from('\r', 'utf8')[0];

const backslashN = Buffer.from('\n', 'utf8')[0];

class ProtocolBuffer {
  constructor() {
    this.index = 0;
    this.buffer = Buffer.allocUnsafe(defaultSize);
  }
  append(data) {
    let toAppend = null;
    if (Buffer.isBuffer(data)) {
      toAppend = data;
    } else {
      toAppend = Buffer.from(data, 'utf8');
    }
    if (this.buffer.length - this.index >= toAppend.length) {
      toAppend.copy(this.buffer, this.index, 0, toAppend.length);
    } else {
      const newSize = (Math.ceil((this.index + toAppend.length) / defaultSize) + 1) * defaultSize;
      if (this.index === 0) {
        this.buffer = Buffer.allocUnsafe(newSize);
        toAppend.copy(this.buffer, 0, 0, toAppend.length);
      } else {
        this.buffer = Buffer.concat([ this.buffer.slice(0, this.index), toAppend ], newSize);
      }
    }
    this.index += toAppend.length;
  }
  tryReadContentLength() {
    let result = -1;
    let current = 0;
    while (current < this.index && (this.buffer[current] === blank || this.buffer[current] === backslashR || this.buffer[current] === backslashN)) {
      current++;
    }
    if (this.index < current + contentLengthSize) {
      return result;
    }
    current += contentLengthSize;
    const start = current;
    while (current < this.index && this.buffer[current] !== backslashR) {
      current++;
    }
    if (current + 3 >= this.index || this.buffer[current + 1] !== backslashN || this.buffer[current + 2] !== backslashR || this.buffer[current + 3] !== backslashN) {
      return result;
    }
    const data = this.buffer.toString('utf8', start, current);
    result = parseInt(data);
    this.buffer = this.buffer.slice(current + 4);
    this.index = this.index - (current + 4);
    return result;
  }
  tryReadContent(length) {
    if (this.index < length) {
      return null;
    }
    const result = this.buffer.toString('utf8', 0, length);
    let sourceStart = length;
    while (sourceStart < this.index && (this.buffer[sourceStart] === backslashR || this.buffer[sourceStart] === backslashN)) {
      sourceStart++;
    }
    this.buffer.copy(this.buffer, 0, sourceStart);
    this.index = this.index - sourceStart;
    return result;
  }
}

var TsServerLogLevel;

(function(TsServerLogLevel) {
  TsServerLogLevel[TsServerLogLevel['Off'] = 0] = 'Off';
  TsServerLogLevel[TsServerLogLevel['Normal'] = 1] = 'Normal';
  TsServerLogLevel[TsServerLogLevel['Terse'] = 2] = 'Terse';
  TsServerLogLevel[TsServerLogLevel['RequestTime'] = 3] = 'RequestTime';
  TsServerLogLevel[TsServerLogLevel['Verbose'] = 4] = 'Verbose';
})(TsServerLogLevel || (TsServerLogLevel = {}));

(function(TsServerLogLevel) {
  function fromString(value) {
    switch (value?.toLowerCase()) {
     case 'normal':
      return TsServerLogLevel.Normal;

     case 'terse':
      return TsServerLogLevel.Terse;

     case 'requestTime':
      return TsServerLogLevel.RequestTime;

     case 'verbose':
      return TsServerLogLevel.Verbose;

     case 'off':
     default:
      return TsServerLogLevel.Off;
    }
  }
  TsServerLogLevel.fromString = fromString;
  function toString(value) {
    switch (value) {
     case TsServerLogLevel.Normal:
      return 'normal';

     case TsServerLogLevel.Terse:
      return 'terse';

     case TsServerLogLevel.Verbose:
      return 'verbose';

     case TsServerLogLevel.Off:
     default:
      return 'off';
    }
  }
  TsServerLogLevel.toString = toString;
})(TsServerLogLevel || (TsServerLogLevel = {}));

function toSyntaxServerConfiguration(value) {
  switch (value) {
   case 'never':
    return 0;

   case 'auto':
    return 2;
  }
  return 2;
}

class TypeScriptServerSpawner {
  constructor(_apiVersion, _logDirectoryProvider, _logger, _tracer) {
    this._apiVersion = _apiVersion;
    this._logDirectoryProvider = _logDirectoryProvider;
    this._logger = _logger;
    this._tracer = _tracer;
  }
  spawn(version, capabilities, configuration, pluginManager, delegate) {
    let primaryServer;
    const serverType = this.getCompositeServerType(version, capabilities, configuration);
    switch (serverType) {
     case 1:
     case 2:
      {
        const enableDynamicRouting = serverType === 2;
        primaryServer = new SyntaxRoutingTsServer({
          syntax: this.spawnTsServer('syntax', version, configuration, pluginManager),
          semantic: this.spawnTsServer('semantic', version, configuration, pluginManager)
        }, delegate, enableDynamicRouting);
        break;
      }

     case 0:
      {
        primaryServer = this.spawnTsServer('main', version, configuration, pluginManager);
        break;
      }

     case 3:
      {
        primaryServer = this.spawnTsServer('syntax', version, configuration, pluginManager);
        break;
      }
    }
    return primaryServer;
  }
  getCompositeServerType(version, capabilities, configuration) {
    if (!capabilities.has(ClientCapability.Semantic)) {
      return 3;
    }
    switch (configuration.useSyntaxServer) {
     case 1:
      return 3;

     case 0:
      return 0;

     case 2:
      if (version.version?.gte(API.v340)) {
        return version.version?.gte(API.v400) ? 2 : 1;
      }
      return 0;
    }
  }
  spawnTsServer(kind, version, configuration, pluginManager) {
    const processFactory = new NodeTsServerProcessFactory;
    const canceller = nodeRequestCancellerFactory.create(kind, this._tracer);
    const {args: args, tsServerLogFile: tsServerLogFile} = this.getTsServerArgs(kind, configuration, this._apiVersion, pluginManager, canceller.cancellationPipeName);
    if (this.isLoggingEnabled(configuration)) {
      if (tsServerLogFile) {
        this._logger.logIgnoringVerbosity(LogLevel.Info, `<${kind}> Log file: ${tsServerLogFile}`);
      } else {
        this._logger.logIgnoringVerbosity(LogLevel.Error, `<${kind}> Could not create log directory`);
      }
    }
    const tsProcess = processFactory.fork(version, args, kind, configuration);
    this._logger.log('Starting tsserver');
    return new SingleTsServer(kind, this.kindToServerType(kind), tsProcess, tsServerLogFile, canceller, version, this._tracer);
  }
  kindToServerType(kind) {
    switch (kind) {
     case 'syntax':
      return ServerType.Syntax;

     case 'main':
     case 'semantic':
     case 'diagnostics':
     default:
      return ServerType.Semantic;
    }
  }
  getTsServerArgs(kind, configuration, apiVersion, pluginManager, cancellationPipeName) {
    const args = [];
    let tsServerLogFile;
    let tsServerTraceDirectory;
    if (kind === 'syntax') {
      if (apiVersion.gte(API.v401)) {
        args.push('--serverMode', 'partialSemantic');
      } else {
        args.push('--syntaxOnly');
      }
    }
    args.push('--useInferredProjectPerProjectRoot');
    const {disableAutomaticTypingAcquisition: disableAutomaticTypingAcquisition, locale: locale, npmLocation: npmLocation} = configuration;
    if (disableAutomaticTypingAcquisition || kind === 'syntax' || kind === 'diagnostics') {
      args.push('--disableAutomaticTypingAcquisition');
    }
    if (cancellationPipeName) {
      args.push('--cancellationPipeName', `${cancellationPipeName}*`);
    }
    if (this.isLoggingEnabled(configuration)) {
      const logDir = this._logDirectoryProvider.getNewLogDirectory();
      if (logDir) {
        tsServerLogFile = path__default.join(logDir, 'tsserver.log');
        args.push('--logVerbosity', TsServerLogLevel.toString(configuration.logVerbosity));
        args.push('--logFile', tsServerLogFile);
      }
    }
    const pluginPaths = [];
    if (pluginManager.plugins.length) {
      args.push('--globalPlugins', pluginManager.plugins.map((x => x.name)).join(','));
      for (const plugin of pluginManager.plugins) {
        pluginPaths.push(plugin.uri.fsPath);
      }
    }
    if (pluginPaths.length !== 0) {
      args.push('--pluginProbeLocations', pluginPaths.join(','));
    }
    if (npmLocation) {
      this._logger.info(`using npm from ${npmLocation}`);
      args.push('--npmLocation', `"${npmLocation}"`);
    }
    args.push('--locale', locale || 'en');
    args.push('--validateDefaultNpmLocation');
    return {
      args: args,
      tsServerLogFile: tsServerLogFile,
      tsServerTraceDirectory: tsServerTraceDirectory
    };
  }
  isLoggingEnabled(configuration) {
    return configuration.logVerbosity !== TsServerLogLevel.Off;
  }
}

var Trace;

(function(Trace) {
  Trace[Trace['Off'] = 0] = 'Off';
  Trace[Trace['Messages'] = 1] = 'Messages';
  Trace[Trace['Verbose'] = 2] = 'Verbose';
})(Trace || (Trace = {}));

(function(Trace) {
  function fromString(value) {
    value = value.toLowerCase();
    switch (value) {
     case 'off':
      return Trace.Off;

     case 'messages':
      return Trace.Messages;

     case 'verbose':
      return Trace.Verbose;

     default:
      return Trace.Off;
    }
  }
  Trace.fromString = fromString;
})(Trace || (Trace = {}));

class Tracer {
  constructor(logger, trace) {
    this.logger = logger;
    this.trace = trace;
  }
  traceRequest(serverId, request, responseExpected, queueLength) {
    if (this.trace === Trace.Off) {
      return;
    }
    let data = undefined;
    if (this.trace === Trace.Verbose && request.arguments) {
      data = `Arguments: ${JSON.stringify(request.arguments, null, 4)}`;
    }
    this.logTrace(serverId, `Sending request: ${request.command} (${request.seq}). Response expected: ${responseExpected ? 'yes' : 'no'}. Current queue length: ${queueLength}`, data);
  }
  traceResponse(serverId, response, meta) {
    if (this.trace === Trace.Off) {
      return;
    }
    let data = undefined;
    if (this.trace === Trace.Verbose && response.body) {
      data = `Result: ${JSON.stringify(response.body, null, 4)}`;
    }
    this.logTrace(serverId, `Response received: ${response.command} (${response.request_seq}). Request took ${Date.now() - meta.queuingStartTime} ms. Success: ${response.success} ${!response.success ? `. Message: ${response.message}` : ''}`, data);
  }
  traceRequestCompleted(serverId, command, request_seq, meta) {
    if (this.trace === Trace.Off) {
      return;
    }
    this.logTrace(serverId, `Async response received: ${command} (${request_seq}). Request took ${Date.now() - meta.queuingStartTime} ms.`);
  }
  traceEvent(serverId, event) {
    if (this.trace === Trace.Off) {
      return;
    }
    let data = undefined;
    if (this.trace === Trace.Verbose && event.body) {
      data = `Data: ${JSON.stringify(event.body, null, 4)}`;
    }
    this.logTrace(serverId, `Event received: ${event.event} (${event.seq}).`, data);
  }
  logTrace(serverId, message, data) {
    if (this.trace !== Trace.Off) {
      this.logger.trace('Trace', `<${serverId}> ${message}`, data);
    }
  }
}

class ZipfileURI extends URI {
  constructor(uri, components) {
    super(components);
    this._originalUri = uri;
  }
  toString(_skipEncoding = false) {
    return this._originalUri;
  }
  static parse(value, _strict = false) {
    const uri = URI.parse(value, _strict);
    return new ZipfileURI(value, uri);
  }
}

var ServerState;

(function(ServerState) {
  ServerState.None = {
    type: 0
  };
  class Running {
    constructor(server, apiVersion, tsserverVersion, languageServiceEnabled) {
      this.server = server;
      this.apiVersion = apiVersion;
      this.tsserverVersion = tsserverVersion;
      this.languageServiceEnabled = languageServiceEnabled;
      this.type = 1;
      this.toCancelOnResourceChange = new Set;
    }
    updateTsserverVersion(tsserverVersion) {
      this.tsserverVersion = tsserverVersion;
    }
    updateLanguageServiceEnabled(enabled) {
      this.languageServiceEnabled = enabled;
    }
  }
  ServerState.Running = Running;
  class Errored {
    constructor(error, tsServerLogFile) {
      this.error = error;
      this.tsServerLogFile = tsServerLogFile;
      this.type = 2;
    }
  }
  ServerState.Errored = Errored;
})(ServerState || (ServerState = {}));

function getDignosticsKind(event) {
  switch (event.event) {
   case 'syntaxDiag':
    return 0;

   case 'semanticDiag':
    return 1;

   case 'suggestionDiag':
    return 2;
  }
  throw new Error('Unknown dignostics kind');
}

class ServerInitializingIndicator {
  constructor(lspClient) {
    this.lspClient = lspClient;
  }
  reset() {
    if (this._task) {
      const task = this._task;
      this._task = undefined;
      task.then((reporter => reporter.done()));
    }
  }
  startedLoadingProject(projectName) {
    this.reset();
    this._loadingProjectName = projectName;
    this._task = this.lspClient.createProgressReporter();
    this._task.then((reporter => reporter.begin('Initializing JS/TS language features…')));
  }
  finishedLoadingProject(projectName) {
    if (this._loadingProjectName === projectName) {
      this.reset();
    }
  }
}

const emptyAuthority = 'ts-nul-authority';

const inMemoryResourcePrefix = '^';

const RE_IN_MEMORY_FILEPATH = /^\^\/([^/]+)\/([^/]*)\/(.+)$/;

class TsClient {
  constructor(onCaseInsensitiveFileSystem, logger, lspClient) {
    this.apiVersion = API.defaultVersion;
    this.typescriptVersionSource = 'bundled';
    this.serverState = ServerState.None;
    this.isNeovimHost = false;
    this.workspaceFolders = [];
    this.useSyntaxServer = 2;
    this.pluginManager = new PluginManager;
    this.documents = new LspDocuments(this, lspClient, onCaseInsensitiveFileSystem);
    this.logger = new PrefixingLogger(logger, '[tsclient]');
    this.tsserverLogger = new PrefixingLogger(this.logger, '[tsserver]');
    this.lspClient = lspClient;
    this.loadingIndicator = new ServerInitializingIndicator(this.lspClient);
  }
  get documentsForTesting() {
    return this.documents.documentsForTesting;
  }
  openTextDocument(textDocument) {
    return this.documents.openTextDocument(textDocument);
  }
  onDidCloseTextDocument(uri) {
    this.documents.onDidCloseTextDocument(uri);
  }
  onDidChangeTextDocument(params) {
    this.documents.onDidChangeTextDocument(params);
  }
  lastFileOrDummy() {
    return this.documents.files[0] || this.workspaceFolders[0]?.uri.fsPath;
  }
  toTsFilePath(stringUri) {
    if (this.isNeovimHost && stringUri.startsWith('zipfile:')) {
      return stringUri;
    }
    const resource = URI.parse(stringUri);
    if (disabledSchemes.has(resource.scheme)) {
      return undefined;
    }
    if (resource.scheme === file) {
      return resource.fsPath;
    }
    return inMemoryResourcePrefix + '/' + resource.scheme + '/' + (resource.authority || emptyAuthority) + (resource.path.startsWith('/') ? resource.path : '/' + resource.path) + (resource.fragment ? '#' + resource.fragment : '');
  }
  toOpenDocument(textDocumentUri, options = {}) {
    const filepath = this.toTsFilePath(textDocumentUri);
    const document = filepath && this.documents.get(filepath);
    if (!document) {
      const uri = URI.parse(textDocumentUri);
      if (!options.suppressAlertOnFailure && !disabledSchemes.has(uri.scheme)) {
        console.error(`Unexpected resource ${textDocumentUri}`);
      }
      return undefined;
    }
    return document;
  }
  requestDiagnosticsForTesting() {
    this.documents.requestDiagnosticsForTesting();
  }
  hasPendingDiagnostics(resource) {
    return this.documents.hasPendingDiagnostics(resource);
  }
  toResource(filepath) {
    if (this.isNeovimHost && filepath.startsWith('zipfile:')) {
      return ZipfileURI.parse(filepath);
    }
    if (filepath.startsWith(inMemoryResourcePrefix)) {
      const parts = filepath.match(RE_IN_MEMORY_FILEPATH);
      if (parts) {
        const resource = URI.parse(parts[1] + '://' + (parts[2] === emptyAuthority ? '' : parts[2]) + '/' + parts[3]);
        const tsFilepath = this.toTsFilePath(resource.toString());
        const document = tsFilepath && this.documents.get(tsFilepath);
        return document ? document.uri : resource;
      }
    }
    const fileUri = URI.file(filepath);
    const document = this.documents.get(fileUri.fsPath);
    return document ? document.uri : fileUri;
  }
  toResourceUri(filepath) {
    return this.toResource(filepath).toString();
  }
  getWorkspaceRootForResource(resource) {
    for (const root of this.workspaceFolders.sort(((a, b) => a.uri.fsPath.length - b.uri.fsPath.length))) {
      if (root.uri.scheme === resource.scheme && root.uri.authority === resource.authority) {
        if (resource.fsPath.startsWith(root.uri.fsPath + path__default.sep)) {
          return root.uri;
        }
      }
    }
    return undefined;
  }
  get capabilities() {
    if (this.useSyntaxServer === 1) {
      return new ClientCapabilities(ClientCapability.Syntax, ClientCapability.EnhancedSyntax);
    }
    if (this.apiVersion.gte(API.v400)) {
      return new ClientCapabilities(ClientCapability.Syntax, ClientCapability.EnhancedSyntax, ClientCapability.Semantic);
    }
    return new ClientCapabilities(ClientCapability.Syntax, ClientCapability.Semantic);
  }
  hasCapabilityForResource(resource, capability) {
    if (!this.capabilities.has(capability)) {
      return false;
    }
    switch (capability) {
     case ClientCapability.Semantic:
      {
        return getSemanticSupportedSchemes().includes(resource.scheme);
      }

     case ClientCapability.Syntax:
     case ClientCapability.EnhancedSyntax:
      {
        return true;
      }
    }
  }
  configurePlugin(pluginName, configuration) {
    if (this.apiVersion.gte(API.v314)) {
      this.executeWithoutWaitingForResponse(CommandTypes.ConfigurePlugin, {
        pluginName: pluginName,
        configuration: configuration
      });
    }
  }
  start(workspaceRoot, options) {
    this.apiVersion = options.typescriptVersion.version || API.defaultVersion;
    this.typescriptVersionSource = options.typescriptVersion.source;
    this.isNeovimHost = options.hostInfo === 'neovim';
    this.tracer = new Tracer(this.tsserverLogger, options.trace);
    this.workspaceFolders = workspaceRoot ? [ {
      uri: URI.file(workspaceRoot)
    } ] : [];
    this.useSyntaxServer = options.useSyntaxServer;
    this.onEvent = options.onEvent;
    this.onExit = options.onExit;
    this.pluginManager.setPlugins(options.plugins);
    const modeIds = [ ...jsTsLanguageModes, ...this.pluginManager.plugins.flatMap((x => x.languages)) ];
    this.documents.initialize(modeIds);
    const tsServerSpawner = new TypeScriptServerSpawner(this.apiVersion, options.logDirectoryProvider, this.logger, this.tracer);
    const tsServer = tsServerSpawner.spawn(options.typescriptVersion, this.capabilities, options, this.pluginManager, {
      onFatalError: (command, err) => this.fatalError(command, err)
    });
    this.serverState = new ServerState.Running(tsServer, this.apiVersion, undefined, true);
    tsServer.onExit((data => {
      this.serverState = ServerState.None;
      this.shutdown();
      this.tsserverLogger.error(`Exited. Code: ${data.code}. Signal: ${data.signal}`);
      this.onExit?.(data.code, data.signal);
    }));
    tsServer.onStdErr((error => {
      if (error) {
        this.logger.error(error);
      }
    }));
    tsServer.onError((err => {
      this.serverState = new ServerState.Errored(err, tsServer.tsServerLogFile);
      if (err) {
        this.tsserverLogger.error('Exited with error. Error message is: {0}', err.message || err.name);
      }
      this.serviceExited();
    }));
    tsServer.onEvent((event => this.dispatchEvent(event)));
    return true;
  }
  serviceExited() {
    if (this.serverState.type === 1) {
      this.serverState.server.kill();
    }
    this.loadingIndicator.reset();
  }
  dispatchEvent(event) {
    switch (event.event) {
     case 'syntaxDiag':
     case 'semanticDiag':
     case 'suggestionDiag':
     case 'configFileDiag':
      {
        this.loadingIndicator.reset();
        this.onEvent?.(event);
        break;
      }

     case 'projectsUpdatedInBackground':
      {
        this.loadingIndicator.reset();
        const body = event.body;
        const resources = body.openFiles.map((file => this.toResource(file)));
        this.documents.getErr(resources);
        break;
      }

     case 'projectLoadingStart':
      this.loadingIndicator.startedLoadingProject(event.body.projectName);
      break;

     case 'projectLoadingFinish':
      this.loadingIndicator.finishedLoadingProject(event.body.projectName);
      break;
    }
  }
  shutdown() {
    if (this.loadingIndicator) {
      this.loadingIndicator.reset();
    }
    if (this.serverState.type === 1) {
      this.serverState.server.kill();
    }
    this.serverState = ServerState.None;
  }
  execute(command, args, token, config) {
    let executions;
    if (config?.cancelOnResourceChange) {
      const runningServerState = this.serverState;
      if (token && runningServerState.type === 1) {
        const source = new main$1.CancellationTokenSource;
        token.onCancellationRequested((() => source.cancel()));
        const inFlight = {
          resource: config.cancelOnResourceChange,
          cancel: () => source.cancel()
        };
        runningServerState.toCancelOnResourceChange.add(inFlight);
        executions = this.executeImpl(command, args, {
          isAsync: false,
          token: source.token,
          expectsResult: true,
          ...config
        });
        executions[0].catch((() => {})).finally((() => {
          runningServerState.toCancelOnResourceChange.delete(inFlight);
          source.dispose();
        }));
      }
    }
    if (!executions) {
      executions = this.executeImpl(command, args, {
        isAsync: false,
        token: token,
        expectsResult: true,
        ...config
      });
    }
    if (config?.nonRecoverable) {
      executions[0].catch((err => this.fatalError(command, err)));
    }
    if (command === CommandTypes.UpdateOpen) {
      Promise.all(executions).then((() => {
        this.loadingIndicator.reset();
      }));
    }
    return executions[0].catch((error => {
      throw new main$3.ResponseError(1, error.message);
    }));
  }
  executeWithoutWaitingForResponse(command, args) {
    this.executeImpl(command, args, {
      isAsync: false,
      token: undefined,
      expectsResult: false
    });
  }
  executeAsync(command, args, token) {
    return this.executeImpl(command, args, {
      isAsync: true,
      token: token,
      expectsResult: true
    })[0];
  }
  interruptGetErr(f) {
    return this.documents.interruptGetErr(f);
  }
  cancelInflightRequestsForResource(resource) {
    if (this.serverState.type !== 1) {
      return;
    }
    for (const request of this.serverState.toCancelOnResourceChange) {
      if (request.resource === resource.toString()) {
        request.cancel();
      }
    }
  }
  executeImpl(command, args, executeInfo) {
    const serverState = this.serverState;
    if (serverState.type === 1) {
      return serverState.server.executeImpl(command, args, executeInfo);
    } else {
      return [ Promise.resolve(ServerResponse.NoServer) ];
    }
  }
  fatalError(command, error) {
    this.tsserverLogger.error(`A non-recoverable error occurred while executing command: ${command}`);
    if (error instanceof TypeScriptServerError && error.serverErrorText) {
      this.tsserverLogger.error(error.serverErrorText);
    }
    if (this.serverState.type === 1) {
      this.logger.info('Killing TS Server');
      const logfile = this.serverState.server.tsServerLogFile;
      this.serverState.server.kill();
      if (error instanceof TypeScriptServerError) {
        this.serverState = new ServerState.Errored(error, logfile);
      }
    }
  }
}

const pDebounce = (fn, wait, options = {}) => {
  if (!Number.isFinite(wait)) {
    throw new TypeError('Expected `wait` to be a finite number');
  }
  let leadingValue;
  let timeout;
  let resolveList = [];
  return function(...arguments_) {
    return new Promise((resolve => {
      const shouldCallNow = options.before && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout((() => {
        timeout = null;
        const result = options.before ? leadingValue : fn.apply(this, arguments_);
        for (resolve of resolveList) {
          resolve(result);
        }
        resolveList = [];
      }), wait);
      if (shouldCallNow) {
        leadingValue = fn.apply(this, arguments_);
        resolve(leadingValue);
      } else {
        resolveList.push(resolve);
      }
    }));
  };
};

pDebounce.promise = function_ => {
  let currentPromise;
  return async function(...arguments_) {
    if (currentPromise) {
      return currentPromise;
    }
    try {
      currentPromise = function_.apply(this, arguments_);
      return await currentPromise;
    } finally {
      currentPromise = undefined;
    }
  };
};

var Range;

(function(Range) {
  Range.fromTextSpan = span => Range.fromLocations(span.start, span.end);
  Range.toTextSpan = range => ({
    start: Position.toLocation(range.start),
    end: Position.toLocation(range.end)
  });
  Range.fromLocations = (start, end) => main$2.Range.create(Math.max(0, start.line - 1), Math.max(start.offset - 1, 0), Math.max(0, end.line - 1), Math.max(0, end.offset - 1));
  Range.toFileRangeRequestArgs = (file, range) => ({
    file: file,
    startLine: range.start.line + 1,
    startOffset: range.start.character + 1,
    endLine: range.end.line + 1,
    endOffset: range.end.character + 1
  });
  Range.toFormattingRequestArgs = (file, range) => ({
    file: file,
    line: range.start.line + 1,
    offset: range.start.character + 1,
    endLine: range.end.line + 1,
    endOffset: range.end.character + 1
  });
  function intersection(one, other) {
    const start = Position.Max(other.start, one.start);
    const end = Position.Min(other.end, one.end);
    if (Position.isAfter(start, end)) {
      return undefined;
    }
    return main$2.Range.create(start, end);
  }
  Range.intersection = intersection;
  function union(one, other) {
    const start = Position.Min(other.start, one.start);
    const end = Position.Max(other.end, one.end);
    return main$2.Range.create(start, end);
  }
  Range.union = union;
})(Range || (Range = {}));

var Position;

(function(Position) {
  Position.fromLocation = tslocation => ({
    line: Math.max(tslocation.line - 1, 0),
    character: Math.max(tslocation.offset - 1, 0)
  });
  Position.toLocation = position => ({
    line: position.line + 1,
    offset: position.character + 1
  });
  Position.toFileLocationRequestArgs = (file, position) => ({
    file: file,
    line: position.line + 1,
    offset: position.character + 1
  });
  function Min(...positions) {
    if (!positions.length) {
      return undefined;
    }
    let result = positions.pop();
    for (const p of positions) {
      if (isBefore(p, result)) {
        result = p;
      }
    }
    return result;
  }
  Position.Min = Min;
  function isBefore(one, other) {
    if (one.line < other.line) {
      return true;
    }
    if (other.line < one.line) {
      return false;
    }
    return one.character < other.character;
  }
  Position.isBefore = isBefore;
  function isEqual(one, other) {
    return one.line === other.line && one.character === other.character;
  }
  Position.isEqual = isEqual;
  function Max(...positions) {
    if (!positions.length) {
      return undefined;
    }
    let result = positions.pop();
    for (const p of positions) {
      if (isAfter(p, result)) {
        result = p;
      }
    }
    return result;
  }
  Position.Max = Max;
  function isAfter(one, other) {
    return !isBeforeOrEqual(one, other);
  }
  Position.isAfter = isAfter;
  function isBeforeOrEqual(one, other) {
    if (one.line < other.line) {
      return true;
    }
    if (other.line < one.line) {
      return false;
    }
    return one.character <= other.character;
  }
  Position.isBeforeOrEqual = isBeforeOrEqual;
})(Position || (Position = {}));

var Location;

(function(Location) {
  Location.fromTextSpan = (resource, tsTextSpan) => main$2.Location.create(resource, Range.fromTextSpan(tsTextSpan));
})(Location || (Location = {}));

function toLocation(fileSpan, client) {
  const uri = client.toResourceUri(fileSpan.file);
  return {
    uri: uri,
    range: {
      start: Position.fromLocation(fileSpan.start),
      end: Position.fromLocation(fileSpan.end)
    }
  };
}

const symbolKindsMapping = {
  'enum member': main$3.SymbolKind.Constant,
  'JSX attribute': main$3.SymbolKind.Property,
  'local class': main$3.SymbolKind.Class,
  'local function': main$3.SymbolKind.Function,
  'local var': main$3.SymbolKind.Variable,
  'type parameter': main$3.SymbolKind.Variable,
  alias: main$3.SymbolKind.Variable,
  class: main$3.SymbolKind.Class,
  const: main$3.SymbolKind.Constant,
  constructor: main$3.SymbolKind.Constructor,
  enum: main$3.SymbolKind.Enum,
  field: main$3.SymbolKind.Field,
  file: main$3.SymbolKind.File,
  function: main$3.SymbolKind.Function,
  getter: main$3.SymbolKind.Method,
  interface: main$3.SymbolKind.Interface,
  let: main$3.SymbolKind.Variable,
  method: main$3.SymbolKind.Method,
  module: main$3.SymbolKind.Module,
  parameter: main$3.SymbolKind.Variable,
  property: main$3.SymbolKind.Property,
  setter: main$3.SymbolKind.Method,
  var: main$3.SymbolKind.Variable
};

function toSymbolKind(tspKind) {
  return symbolKindsMapping[tspKind] || main$3.SymbolKind.Variable;
}

function toDiagnosticSeverity(category) {
  switch (category) {
   case 'error':
    return main$3.DiagnosticSeverity.Error;

   case 'warning':
    return main$3.DiagnosticSeverity.Warning;

   case 'suggestion':
    return main$3.DiagnosticSeverity.Hint;

   default:
    return main$3.DiagnosticSeverity.Error;
  }
}

function toDiagnostic(diagnostic, client, features) {
  const lspDiagnostic = {
    range: {
      start: Position.fromLocation(diagnostic.start),
      end: Position.fromLocation(diagnostic.end)
    },
    message: diagnostic.text,
    severity: toDiagnosticSeverity(diagnostic.category),
    code: diagnostic.code,
    source: diagnostic.source || 'typescript',
    relatedInformation: asRelatedInformation(diagnostic.relatedInformation, client)
  };
  if (features.diagnosticsTagSupport) {
    lspDiagnostic.tags = getDiagnosticTags(diagnostic);
  }
  return lspDiagnostic;
}

function getDiagnosticTags(diagnostic) {
  const tags = [];
  if (diagnostic.reportsUnnecessary) {
    tags.push(main$3.DiagnosticTag.Unnecessary);
  }
  if (diagnostic.reportsDeprecated) {
    tags.push(main$3.DiagnosticTag.Deprecated);
  }
  return tags;
}

function asRelatedInformation(info, client) {
  if (!info) {
    return undefined;
  }
  const result = [];
  for (const item of info) {
    const span = item.span;
    if (span) {
      result.push(main$3.DiagnosticRelatedInformation.create(toLocation(span, client), item.message));
    }
  }
  return result;
}

function toSelectionRange(range) {
  return main$3.SelectionRange.create(Range.fromTextSpan(range.textSpan), range.parent ? toSelectionRange(range.parent) : undefined);
}

function toTextEdit(edit) {
  return {
    range: {
      start: Position.fromLocation(edit.start),
      end: Position.fromLocation(edit.end)
    },
    newText: edit.newText
  };
}

function toTextDocumentEdit(change, client) {
  const uri = client.toResourceUri(change.fileName);
  const document = client.toOpenDocument(uri);
  return {
    textDocument: {
      uri: uri,
      version: document?.version ?? null
    },
    edits: change.textChanges.map((c => toTextEdit(c)))
  };
}

function toDocumentHighlight(item) {
  return item.highlightSpans.map((i => ({
    kind: toDocumentHighlightKind(i.kind),
    range: {
      start: Position.fromLocation(i.start),
      end: Position.fromLocation(i.end)
    }
  })));
}

function toDocumentHighlightKind(kind) {
  switch (kind) {
   case HighlightSpanKind.definition:
    return main$3.DocumentHighlightKind.Write;

   case HighlightSpanKind.reference:
   case HighlightSpanKind.writtenReference:
    return main$3.DocumentHighlightKind.Read;

   default:
    return main$3.DocumentHighlightKind.Text;
  }
}

class FileDiagnostics {
  constructor(uri, onPublishDiagnostics, client, features) {
    this.uri = uri;
    this.onPublishDiagnostics = onPublishDiagnostics;
    this.client = client;
    this.features = features;
    this.closed = false;
    this.diagnosticsPerKind = new Map;
    this.firePublishDiagnostics = pDebounce((() => this.publishDiagnostics()), 50);
  }
  update(kind, diagnostics) {
    if (this.diagnosticsPerKind.get(kind)?.length === 0 && diagnostics.length === 0) {
      return;
    }
    this.diagnosticsPerKind.set(kind, diagnostics);
    this.firePublishDiagnostics();
  }
  publishDiagnostics() {
    if (this.closed || !this.features.diagnosticsSupport) {
      return;
    }
    const diagnostics = this.getDiagnostics();
    this.onPublishDiagnostics({
      uri: this.uri,
      diagnostics: diagnostics
    });
  }
  getDiagnostics() {
    const result = [];
    for (const diagnostics of this.diagnosticsPerKind.values()) {
      for (const diagnostic of diagnostics) {
        result.push(toDiagnostic(diagnostic, this.client, this.features));
      }
    }
    return result;
  }
  onDidClose() {
    this.diagnosticsPerKind.clear();
    this.publishDiagnostics();
    this.closed = true;
  }
  async waitForDiagnosticsForTesting() {
    return new Promise((resolve => {
      const interval = setInterval((() => {
        if (this.diagnosticsPerKind.size === 3) {
          clearInterval(interval);
          this.publishDiagnostics();
          resolve();
        }
      }), 50);
    }));
  }
}

class DiagnosticEventQueue {
  constructor(publishDiagnostics, client, features, logger) {
    this.publishDiagnostics = publishDiagnostics;
    this.client = client;
    this.features = features;
    this.logger = logger;
    this.diagnostics = new Map;
    this.ignoredDiagnosticCodes = new Set;
  }
  updateDiagnostics(kind, file, diagnostics) {
    if (kind !== 0 && !this.client.hasCapabilityForResource(this.client.toResource(file), ClientCapability.Semantic)) {
      return;
    }
    if (this.ignoredDiagnosticCodes.size) {
      diagnostics = diagnostics.filter((diagnostic => !this.isDiagnosticIgnored(diagnostic)));
    }
    const uri = this.client.toResourceUri(file);
    const diagnosticsForFile = this.diagnostics.get(uri) || new FileDiagnostics(uri, this.publishDiagnostics, this.client, this.features);
    diagnosticsForFile.update(kind, diagnostics);
    this.diagnostics.set(uri, diagnosticsForFile);
  }
  updateIgnoredDiagnosticCodes(ignoredCodes) {
    this.ignoredDiagnosticCodes = new Set(ignoredCodes);
  }
  getDiagnosticsForFile(file) {
    const uri = this.client.toResourceUri(file);
    return this.diagnostics.get(uri)?.getDiagnostics() || [];
  }
  onDidCloseFile(file) {
    const uri = this.client.toResourceUri(file);
    const diagnosticsForFile = this.diagnostics.get(uri);
    diagnosticsForFile?.onDidClose();
    this.diagnostics.delete(uri);
  }
  async waitForDiagnosticsForTesting(file) {
    const uri = this.client.toResourceUri(file);
    let diagnosticsForFile = this.diagnostics.get(uri);
    if (diagnosticsForFile) {
      diagnosticsForFile.onDidClose();
    }
    diagnosticsForFile = new FileDiagnostics(uri, this.publishDiagnostics, this.client, this.features);
    this.diagnostics.set(uri, diagnosticsForFile);
    this.client.requestDiagnosticsForTesting();
    await diagnosticsForFile.waitForDiagnosticsForTesting();
  }
  isDiagnosticIgnored(diagnostic) {
    return diagnostic.code !== undefined && this.ignoredDiagnosticCodes.has(diagnostic.code);
  }
}

class SourceDefinitionCommand {
  static async execute(uri, position, client, lspClient, reporter, token) {
    if (client.apiVersion.lt(SourceDefinitionCommand.minVersion)) {
      lspClient.showErrorMessage('Go to Source Definition failed. Requires TypeScript 4.7+.');
      return;
    }
    if (!position || typeof position.character !== 'number' || typeof position.line !== 'number') {
      lspClient.showErrorMessage('Go to Source Definition failed. Invalid position.');
      return;
    }
    let file;
    if (!uri || typeof uri !== 'string' || !(file = client.toTsFilePath(uri))) {
      lspClient.showErrorMessage('Go to Source Definition failed. No resource provided.');
      return;
    }
    const document = client.toOpenDocument(client.toResourceUri(file));
    if (!document) {
      lspClient.showErrorMessage('Go to Source Definition failed. File not opened in the editor.');
      return;
    }
    const args = Position.toFileLocationRequestArgs(file, position);
    return await lspClient.withProgress({
      message: 'Finding source definitions…',
      reporter: reporter
    }, (async () => {
      const response = await client.execute(CommandTypes.FindSourceDefinition, args, token);
      if (response.type !== 'response' || !response.body) {
        lspClient.showErrorMessage('No source definitions found.');
        return;
      }
      return response.body.map((reference => toLocation(reference, client)));
    }));
  }
}

SourceDefinitionCommand.id = '_typescript.goToSourceDefinition';

SourceDefinitionCommand.minVersion = API.v470;

const Commands = {
  APPLY_WORKSPACE_EDIT: '_typescript.applyWorkspaceEdit',
  APPLY_CODE_ACTION: '_typescript.applyCodeAction',
  APPLY_REFACTORING: '_typescript.applyRefactoring',
  CONFIGURE_PLUGIN: '_typescript.configurePlugin',
  ORGANIZE_IMPORTS: '_typescript.organizeImports',
  APPLY_RENAME_FILE: '_typescript.applyRenameFile',
  APPLY_COMPLETION_CODE_ACTION: '_typescript.applyCompletionCodeAction',
  SELECT_REFACTORING: '_typescript.selectRefactoring',
  SOURCE_DEFINITION: SourceDefinitionCommand.id
};

const TypescriptVersionNotification = new main$3.NotificationType('$/typescriptVersion');

class MarkdownString {
  constructor(value = '') {
    this.value = value;
  }
  appendText(value, newlineStyle = 0) {
    this.value += escapeMarkdownSyntaxTokens(value).replace(/([ \t]+)/g, ((_match, g1) => '&nbsp;'.repeat(g1.length))).replace(/>/gm, '\\>').replace(/\n/g, newlineStyle === 1 ? '\\\n' : '\n\n');
    return this;
  }
  appendMarkdown(value) {
    this.value += value;
    return this;
  }
  appendCodeblock(langId, code) {
    this.value += '\n```';
    this.value += langId;
    this.value += '\n';
    this.value += code;
    this.value += '\n```\n';
    return this;
  }
  toMarkupContent() {
    return {
      kind: 'markdown',
      value: this.value
    };
  }
}

function escapeMarkdownSyntaxTokens(text) {
  return text.replace(/[\\`*_{}[\]()#+\-!]/g, '\\$&');
}

function replaceLinks(text) {
  return text.replace(/\{@(link|linkplain|linkcode) (https?:\/\/[^ |}]+?)(?:[| ]([^{}\n]+?))?\}/gi, ((_, tag, link, text) => {
    switch (tag) {
     case 'linkcode':
      return `[\`${text ? text.trim() : link}\`](${link})`;

     default:
      return `[${text ? text.trim() : link}](${link})`;
    }
  }));
}

function processInlineTags(text) {
  return replaceLinks(text);
}

function getTagBodyText(tag, filePathConverter) {
  if (!tag.text) {
    return undefined;
  }
  function makeCodeblock(text) {
    if (/^\s*[~`]{3}/m.test(text)) {
      return text;
    }
    return '```\n' + text + '\n```';
  }
  const text = convertLinkTags(tag.text, filePathConverter);
  switch (tag.name) {
   case 'example':
    {
      const captionTagMatches = text.match(/<caption>(.*?)<\/caption>\s*(\r\n|\n)/);
      if (captionTagMatches && captionTagMatches.index === 0) {
        return captionTagMatches[1] + '\n' + makeCodeblock(text.substring(captionTagMatches[0].length));
      } else {
        return makeCodeblock(text);
      }
    }

   case 'author':
    {
      const emailMatch = text.match(/(.+)\s<([-.\w]+@[-.\w]+)>/);
      if (emailMatch === null) {
        return text;
      } else {
        return `${emailMatch[1]} ${emailMatch[2]}`;
      }
    }

   case 'default':
    return makeCodeblock(text);
  }
  return processInlineTags(text);
}

function getTagDocumentation(tag, filePathConverter) {
  switch (tag.name) {
   case 'augments':
   case 'extends':
   case 'param':
   case 'template':
    {
      const body = convertLinkTags(tag.text, filePathConverter).split(/^(\S+)\s*-?\s*/);
      if (body?.length === 3) {
        const param = body[1];
        const doc = body[2];
        const label = `*@${tag.name}* \`${param}\``;
        if (!doc) {
          return label;
        }
        return label + (doc.match(/\r\n|\n/g) ? '  \n' + processInlineTags(doc) : ` — ${processInlineTags(doc)}`);
      }
    }
  }
  const label = `*@${tag.name}*`;
  const text = getTagBodyText(tag, filePathConverter);
  if (!text) {
    return label;
  }
  return label + (text.match(/\r\n|\n/g) ? '  \n' + text : ` — ${text}`);
}

function plainWithLinks(parts, filePathConverter) {
  return processInlineTags(convertLinkTags(parts, filePathConverter));
}

function convertLinkTags(parts, filePathConverter) {
  if (!parts) {
    return '';
  }
  if (typeof parts === 'string') {
    return parts;
  }
  const out = [];
  let currentLink;
  for (const part of parts) {
    switch (part.kind) {
     case 'link':
      if (currentLink) {
        if (currentLink.target) {
          const link = filePathConverter.toResource(currentLink.target.file).with({
            fragment: `L${currentLink.target.start.line},${currentLink.target.start.offset}`
          });
          const linkText = currentLink.text ? currentLink.text : escapeMarkdownSyntaxTokensForCode(currentLink.name ?? '');
          out.push(`[${currentLink.linkcode ? '`' + linkText + '`' : linkText}](${link.toString()})`);
        } else {
          const text = currentLink.text ?? currentLink.name;
          if (text) {
            if (/^https?:/.test(text)) {
              const parts = text.split(' ');
              if (parts.length === 1) {
                out.push(parts[0]);
              } else if (parts.length > 1) {
                const linkText = escapeMarkdownSyntaxTokensForCode(parts.slice(1).join(' '));
                out.push(`[${currentLink.linkcode ? '`' + linkText + '`' : linkText}](${parts[0]})`);
              }
            } else {
              out.push(escapeMarkdownSyntaxTokensForCode(text));
            }
          }
        }
        currentLink = undefined;
      } else {
        currentLink = {
          linkcode: part.text === '{@linkcode '
        };
      }
      break;

     case 'linkName':
      if (currentLink) {
        currentLink.name = part.text;
        currentLink.target = part.target;
      }
      break;

     case 'linkText':
      if (currentLink) {
        currentLink.text = part.text;
      }
      break;

     default:
      out.push(part.text);
      break;
    }
  }
  return processInlineTags(out.join(''));
}

function tagsMarkdownPreview(tags, filePathConverter) {
  return tags.map((tag => getTagDocumentation(tag, filePathConverter))).join('  \n\n');
}

function markdownDocumentation(documentation, tags, filePathConverter) {
  const out = new MarkdownString;
  addMarkdownDocumentation(out, documentation, tags, filePathConverter);
  return out.value ? out.toMarkupContent() : undefined;
}

function addMarkdownDocumentation(out, documentation, tags, converter) {
  if (documentation) {
    out.appendMarkdown(plainWithLinks(documentation, converter));
  }
  if (tags) {
    const tagsPreview = tagsMarkdownPreview(tags, converter);
    if (tagsPreview) {
      out.appendMarkdown('\n\n' + tagsPreview);
    }
  }
  return out;
}

function escapeMarkdownSyntaxTokensForCode(text) {
  return text.replace(/`/g, '\\$&');
}

class SnippetString {
  static isSnippetString(thing) {
    if (thing instanceof SnippetString) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return typeof thing.value === 'string';
  }
  static _escape(value) {
    return value.replace(/\$|}|\\/g, '\\$&');
  }
  constructor(value) {
    this._tabstop = 1;
    this.value = value || '';
  }
  appendText(str) {
    this.value += SnippetString._escape(str);
    return this;
  }
  appendTabstop(n = this._tabstop++) {
    this.value += '$';
    this.value += n;
    return this;
  }
  appendPlaceholder(value, n = this._tabstop++) {
    if (typeof value === 'function') {
      const nested = new SnippetString;
      nested._tabstop = this._tabstop;
      value(nested);
      this._tabstop = nested._tabstop;
      value = nested.value;
    } else {
      value = SnippetString._escape(value);
    }
    this.value += '${';
    this.value += n;
    this.value += ':';
    this.value += value;
    this.value += '}';
    return this;
  }
  appendVariable(name, defaultValue) {
    if (typeof defaultValue === 'function') {
      const nested = new SnippetString;
      nested._tabstop = this._tabstop;
      defaultValue(nested);
      this._tabstop = nested._tabstop;
      defaultValue = nested.value;
    } else if (typeof defaultValue === 'string') {
      defaultValue = defaultValue.replace(/\$|}/g, '\\$&');
    }
    this.value += '${';
    this.value += name;
    if (defaultValue) {
      this.value += ':';
      this.value += defaultValue;
    }
    this.value += '}';
    return this;
  }
}

class CompletionDataCache {
  constructor() {
    this.store = new Map;
    this.lastCacheId = 0;
  }
  reset() {
    this.lastCacheId = 0;
    this.store.clear();
  }
  add(data) {
    const cacheId = ++this.lastCacheId;
    this.store.set(cacheId, data);
    return cacheId;
  }
  get(cacheId) {
    return this.store.get(cacheId);
  }
}

function asCompletionItems(entries, completionDataCache, file, position, document, filePathConverter, options, features, completionContext) {
  const completions = [];
  for (const entry of entries) {
    if (entry.kind === 'warning') {
      continue;
    }
    const completion = asCompletionItem(entry, completionDataCache, file, position, document, filePathConverter, options, features, completionContext);
    if (!completion) {
      continue;
    }
    completions.push(completion);
  }
  return completions;
}

function asCompletionItem(entry, completionDataCache, file, position, document, filePathConverter, options, features, completionContext) {
  const cacheId = completionDataCache.add({
    file: file,
    line: position.line + 1,
    offset: position.character + 1,
    entryNames: [ entry.source || entry.data ? {
      name: entry.name,
      source: entry.source,
      data: entry.data
    } : entry.name ]
  });
  const item = {
    label: entry.name,
    kind: asCompletionItemKind(entry.kind),
    sortText: entry.sortText,
    preselect: entry.isRecommended,
    data: {
      cacheId: cacheId
    }
  };
  if (features.completionCommitCharactersSupport) {
    item.commitCharacters = asCommitCharacters(entry.kind);
  }
  if (features.completionLabelDetails) {
    item.labelDetails = entry.labelDetails;
  }
  if (entry.source && entry.hasAction) {
    item.sortText = `￿${entry.sortText}`;
  }
  const {isSnippet: isSnippet, replacementSpan: replacementSpan, sourceDisplay: sourceDisplay} = entry;
  if (isSnippet && !features.completionSnippets) {
    return null;
  }
  if (features.completionSnippets && (isSnippet || canCreateSnippetOfFunctionCall(item.kind, options))) {
    item.insertTextFormat = main$3.InsertTextFormat.Snippet;
  }
  if (sourceDisplay) {
    item.detail = plainWithLinks(sourceDisplay, filePathConverter);
  }
  const {line: line, optionalReplacementRange: optionalReplacementRange, isMemberCompletion: isMemberCompletion, dotAccessorContext: dotAccessorContext} = completionContext;
  let range = getRangeFromReplacementSpan(replacementSpan, optionalReplacementRange, position, document, features);
  let {insertText: insertText} = entry;
  if (!features.completionDisableFilterText) {
    item.filterText = getFilterText(entry, optionalReplacementRange, line, insertText);
  }
  if (isMemberCompletion && dotAccessorContext && !entry.isSnippet) {
    const newInsertText = dotAccessorContext.text + (insertText || item.label);
    if (!features.completionDisableFilterText) {
      item.filterText = newInsertText;
    }
    if (!range) {
      if (features.completionInsertReplaceSupport && optionalReplacementRange) {
        range = {
          insert: dotAccessorContext.range,
          replace: Range.union(dotAccessorContext.range, optionalReplacementRange)
        };
      } else {
        range = {
          replace: dotAccessorContext.range
        };
      }
      insertText = newInsertText;
    }
  }
  if (entry.kindModifiers) {
    const kindModifiers = new Set(entry.kindModifiers.split(/,|\s+/g));
    if (kindModifiers.has(KindModifiers.optional)) {
      if (!insertText) {
        insertText = item.label;
      }
      if (!item.filterText) {
        item.filterText = item.label;
      }
      item.label += '?';
    }
    if (kindModifiers.has(KindModifiers.deprecated)) {
      item.tags = [ main$3.CompletionItemTag.Deprecated ];
    }
    if (entry.kind === ScriptElementKind.scriptElement) {
      for (const extModifier of KindModifiers.fileExtensionKindModifiers) {
        if (kindModifiers.has(extModifier)) {
          if (entry.name.toLowerCase().endsWith(extModifier)) {
            item.detail = entry.name;
          } else {
            item.detail = entry.name + extModifier;
          }
          break;
        }
      }
    }
  }
  if (range) {
    item.textEdit = range.insert ? main$3.InsertReplaceEdit.create(insertText || item.label, range.insert, range.replace) : main$3.TextEdit.replace(range.replace, insertText || item.label);
  } else {
    item.insertText = insertText;
  }
  return item;
}

function getRangeFromReplacementSpan(replacementSpan, optionalReplacementRange, position, document, features) {
  if (replacementSpan) {
    return {
      replace: ensureRangeIsOnSingleLine(Range.fromTextSpan(replacementSpan), document)
    };
  }
  if (features.completionInsertReplaceSupport && optionalReplacementRange) {
    const range = ensureRangeIsOnSingleLine(optionalReplacementRange, document);
    return {
      insert: main$3.Range.create(range.start, position),
      replace: range
    };
  }
}

function getFilterText(entry, wordRange, line, insertText) {
  if (entry.name.startsWith('#')) {
    const wordStart = wordRange ? line.charAt(wordRange.start.character) : undefined;
    if (insertText) {
      if (insertText.startsWith('this.#')) {
        return wordStart === '#' ? insertText : insertText.replace(/&this\.#/, '');
      } else {
        return wordStart;
      }
    } else {
      return wordStart === '#' ? undefined : entry.name.replace(/^#/, '');
    }
  }
  if (insertText?.startsWith('this.')) {
    return undefined;
  }
  if (insertText?.startsWith('[')) {
    return insertText.replace(/^\[['"](.+)[['"]\]$/, '.$1');
  }
  return insertText;
}

function ensureRangeIsOnSingleLine(range, document) {
  if (range.start.line !== range.end.line) {
    return main$3.Range.create(range.start, document.getLineEnd(range.start.line));
  }
  return range;
}

function asCompletionItemKind(kind) {
  switch (kind) {
   case ScriptElementKind.primitiveType:
   case ScriptElementKind.keyword:
    return main$3.CompletionItemKind.Keyword;

   case ScriptElementKind.constElement:
   case ScriptElementKind.letElement:
   case ScriptElementKind.variableElement:
   case ScriptElementKind.localVariableElement:
   case ScriptElementKind.alias:
   case ScriptElementKind.parameterElement:
    return main$3.CompletionItemKind.Variable;

   case ScriptElementKind.memberVariableElement:
   case ScriptElementKind.memberGetAccessorElement:
   case ScriptElementKind.memberSetAccessorElement:
    return main$3.CompletionItemKind.Field;

   case ScriptElementKind.functionElement:
   case ScriptElementKind.localFunctionElement:
    return main$3.CompletionItemKind.Function;

   case ScriptElementKind.memberFunctionElement:
   case ScriptElementKind.constructSignatureElement:
   case ScriptElementKind.callSignatureElement:
   case ScriptElementKind.indexSignatureElement:
    return main$3.CompletionItemKind.Method;

   case ScriptElementKind.enumElement:
    return main$3.CompletionItemKind.Enum;

   case ScriptElementKind.enumMemberElement:
    return main$3.CompletionItemKind.EnumMember;

   case ScriptElementKind.moduleElement:
   case ScriptElementKind.externalModuleName:
    return main$3.CompletionItemKind.Module;

   case ScriptElementKind.classElement:
   case ScriptElementKind.typeElement:
    return main$3.CompletionItemKind.Class;

   case ScriptElementKind.interfaceElement:
    return main$3.CompletionItemKind.Interface;

   case ScriptElementKind.warning:
    return main$3.CompletionItemKind.Text;

   case ScriptElementKind.scriptElement:
    return main$3.CompletionItemKind.File;

   case ScriptElementKind.directory:
    return main$3.CompletionItemKind.Folder;

   case ScriptElementKind.string:
    return main$3.CompletionItemKind.Constant;
  }
  return main$3.CompletionItemKind.Property;
}

function asCommitCharacters(kind) {
  const commitCharacters = [];
  switch (kind) {
   case ScriptElementKind.memberGetAccessorElement:
   case ScriptElementKind.memberSetAccessorElement:
   case ScriptElementKind.constructSignatureElement:
   case ScriptElementKind.callSignatureElement:
   case ScriptElementKind.indexSignatureElement:
   case ScriptElementKind.enumElement:
   case ScriptElementKind.interfaceElement:
    commitCharacters.push('.');
    break;

   case ScriptElementKind.moduleElement:
   case ScriptElementKind.alias:
   case ScriptElementKind.constElement:
   case ScriptElementKind.letElement:
   case ScriptElementKind.variableElement:
   case ScriptElementKind.localVariableElement:
   case ScriptElementKind.memberVariableElement:
   case ScriptElementKind.classElement:
   case ScriptElementKind.functionElement:
   case ScriptElementKind.memberFunctionElement:
    commitCharacters.push('.', ',');
    commitCharacters.push('(');
    break;
  }
  return commitCharacters.length === 0 ? undefined : commitCharacters;
}

async function asResolvedCompletionItem(item, details, document, client, options, features) {
  item.detail = asDetail(details, client);
  const {documentation: documentation, tags: tags} = details;
  item.documentation = markdownDocumentation(documentation, tags, client);
  if (details.codeActions?.length) {
    const {additionalTextEdits: additionalTextEdits, command: command} = getCodeActions(details.codeActions, document.filepath, client);
    item.additionalTextEdits = additionalTextEdits;
    item.command = command;
  }
  if (document && features.completionSnippets && canCreateSnippetOfFunctionCall(item.kind, options)) {
    const {line: line, offset: offset} = item.data;
    const position = Position.fromLocation({
      line: line,
      offset: offset
    });
    const shouldCompleteFunction = await isValidFunctionCompletionContext(position, client, document);
    if (shouldCompleteFunction) {
      createSnippetOfFunctionCall(item, details);
    }
  }
  return item;
}

async function isValidFunctionCompletionContext(position, client, document) {
  try {
    const args = Position.toFileLocationRequestArgs(document.filepath, position);
    const response = await client.execute(CommandTypes.Quickinfo, args);
    if (response.type === 'response' && response.body) {
      switch (response.body.kind) {
       case 'var':
       case 'let':
       case 'const':
       case 'alias':
        return false;
      }
    }
  } catch {}
  const after = document.getLine(position.line).slice(position.character);
  return after.match(/^[a-z_$0-9]*\s*\(/gi) === null;
}

function canCreateSnippetOfFunctionCall(kind, options) {
  return options.completeFunctionCalls === true && (kind === main$3.CompletionItemKind.Function || kind === main$3.CompletionItemKind.Method);
}

function createSnippetOfFunctionCall(item, detail) {
  const {displayParts: displayParts} = detail;
  const parameterListParts = getParameterListParts(displayParts);
  const snippet = new SnippetString;
  snippet.appendText(`${item.insertText || item.textEdit?.newText || item.label}(`);
  appendJoinedPlaceholders(snippet, parameterListParts.parts, ', ');
  if (parameterListParts.hasOptionalParameters) {
    snippet.appendTabstop();
  }
  snippet.appendText(')');
  snippet.appendTabstop(0);
  item.insertText = snippet.value;
  item.insertTextFormat = main$3.InsertTextFormat.Snippet;
  if (item.textEdit) {
    item.textEdit.newText = snippet.value;
  }
}

function getParameterListParts(displayParts) {
  const parts = [];
  let isInMethod = false;
  let hasOptionalParameters = false;
  let parenCount = 0;
  let braceCount = 0;
  outer: for (let i = 0; i < displayParts.length; ++i) {
    const part = displayParts[i];
    switch (toSymbolDisplayPartKind(part.kind)) {
     case SymbolDisplayPartKind.methodName:
     case SymbolDisplayPartKind.functionName:
     case SymbolDisplayPartKind.text:
     case SymbolDisplayPartKind.propertyName:
      if (parenCount === 0 && braceCount === 0) {
        isInMethod = true;
      }
      break;

     case SymbolDisplayPartKind.parameterName:
      if (parenCount === 1 && braceCount === 0 && isInMethod) {
        const next = displayParts[i + 1];
        const nameIsFollowedByOptionalIndicator = next && next.text === '?';
        const nameIsThis = part.text === 'this';
        if (!nameIsFollowedByOptionalIndicator && !nameIsThis) {
          parts.push(part);
        }
        hasOptionalParameters = hasOptionalParameters || nameIsFollowedByOptionalIndicator;
      }
      break;

     case SymbolDisplayPartKind.punctuation:
      if (part.text === '(') {
        ++parenCount;
      } else if (part.text === ')') {
        --parenCount;
        if (parenCount <= 0 && isInMethod) {
          break outer;
        }
      } else if (part.text === '...' && parenCount === 1) {
        hasOptionalParameters = true;
        break outer;
      } else if (part.text === '{') {
        ++braceCount;
      } else if (part.text === '}') {
        --braceCount;
      }
      break;
    }
  }
  return {
    hasOptionalParameters: hasOptionalParameters,
    parts: parts
  };
}

function appendJoinedPlaceholders(snippet, parts, joiner) {
  for (let i = 0; i < parts.length; ++i) {
    const paramterPart = parts[i];
    snippet.appendPlaceholder(paramterPart.text);
    if (i !== parts.length - 1) {
      snippet.appendText(joiner);
    }
  }
}

function getCodeActions(codeActions, filepath, client) {
  const additionalTextEdits = [];
  let hasRemainingCommandsOrEdits = false;
  for (const tsAction of codeActions) {
    if (tsAction.commands) {
      hasRemainingCommandsOrEdits = true;
    }
    if (tsAction.changes) {
      for (const change of tsAction.changes) {
        const tsFileName = client.toResource(change.fileName).fsPath;
        if (tsFileName === filepath) {
          additionalTextEdits.push(...change.textChanges.map(toTextEdit));
        } else {
          hasRemainingCommandsOrEdits = true;
        }
      }
    }
  }
  let command = undefined;
  if (hasRemainingCommandsOrEdits) {
    command = {
      title: '',
      command: Commands.APPLY_COMPLETION_CODE_ACTION,
      arguments: [ filepath, codeActions.map((codeAction => ({
        commands: codeAction.commands,
        description: codeAction.description,
        changes: codeAction.changes.filter((x => x.fileName !== filepath))
      }))) ]
    };
  }
  return {
    command: command,
    additionalTextEdits: additionalTextEdits.length ? additionalTextEdits : undefined
  };
}

function asDetail({displayParts: displayParts, sourceDisplay: sourceDisplay, source: deprecatedSource}, filePathConverter) {
  const result = [];
  const source = sourceDisplay || deprecatedSource;
  if (source) {
    result.push(`Auto import from '${plainWithLinks(source, filePathConverter)}'`);
  }
  const detail = plainWithLinks(displayParts, filePathConverter);
  if (detail) {
    result.push(detail);
  }
  return result.join('\n');
}

function getCompletionTriggerCharacter(character) {
  switch (character) {
   case '@':
   case '#':
   case ' ':
   case '.':
   case '"':
   case '\'':
   case '`':
   case '/':
   case '<':
    return character;

   default:
    return undefined;
  }
}

function asSignatureHelp(info, context, filePathConverter) {
  const signatures = info.items.map((item => asSignatureInformation(item, filePathConverter)));
  return {
    activeSignature: getActiveSignature(info, signatures, context),
    activeParameter: getActiveParameter(info),
    signatures: signatures
  };
}

function getActiveSignature(info, signatures, context) {
  if (context?.activeSignatureHelp?.activeSignature !== undefined) {
    const previouslyActiveSignature = context.activeSignatureHelp.signatures[context.activeSignatureHelp.activeSignature];
    if (previouslyActiveSignature && context.isRetrigger) {
      const existingIndex = signatures.findIndex((other => other.label === previouslyActiveSignature.label));
      if (existingIndex !== -1) {
        return existingIndex;
      }
    }
  }
  return info.selectedItemIndex;
}

function getActiveParameter(info) {
  const activeSignature = info.items[info.selectedItemIndex];
  if (activeSignature?.isVariadic) {
    return Math.min(info.argumentIndex, activeSignature.parameters.length - 1);
  }
  return info.argumentIndex;
}

function asSignatureInformation(item, filePathConverter) {
  const parameters = item.parameters.map((parameter => asParameterInformation(parameter, filePathConverter)));
  const signature = {
    label: plainWithLinks(item.prefixDisplayParts, filePathConverter),
    documentation: markdownDocumentation(item.documentation, item.tags.filter((x => x.name !== 'param')), filePathConverter),
    parameters: parameters
  };
  signature.label += parameters.map((parameter => parameter.label)).join(plainWithLinks(item.separatorDisplayParts, filePathConverter));
  signature.label += plainWithLinks(item.suffixDisplayParts, filePathConverter);
  return signature;
}

function asParameterInformation(parameter, filePathConverter) {
  const {displayParts: displayParts, documentation: documentation} = parameter;
  return {
    label: plainWithLinks(displayParts, filePathConverter),
    documentation: markdownDocumentation(documentation, undefined, filePathConverter)
  };
}

function toTsTriggerReason(context) {
  switch (context.triggerKind) {
   case main$3.SignatureHelpTriggerKind.TriggerCharacter:
    if (context.triggerCharacter) {
      if (context.isRetrigger) {
        return {
          kind: 'retrigger',
          triggerCharacter: context.triggerCharacter
        };
      } else {
        return {
          kind: 'characterTyped',
          triggerCharacter: context.triggerCharacter
        };
      }
    } else {
      return {
        kind: 'invoked'
      };
    }

   case main$3.SignatureHelpTriggerKind.ContentChange:
    return context.isRetrigger ? {
      kind: 'retrigger'
    } : {
      kind: 'invoked'
    };

   case main$3.SignatureHelpTriggerKind.Invoked:
   default:
    return {
      kind: 'invoked'
    };
  }
}

function provideQuickFix(response, client) {
  if (!response?.body) {
    return [];
  }
  return response.body.map((fix => main$3.CodeAction.create(fix.description, {
    title: fix.description,
    command: Commands.APPLY_WORKSPACE_EDIT,
    arguments: [ {
      documentChanges: fix.changes.map((c => toTextDocumentEdit(c, client)))
    } ]
  }, main$3.CodeActionKind.QuickFix)));
}

function provideRefactors(response, args, features) {
  if (!response?.body) {
    return [];
  }
  const actions = [];
  for (const info of response.body) {
    if (info.inlineable === false) {
      actions.push(asSelectRefactoring(info, args));
    } else {
      const relevantActions = features.codeActionDisabledSupport ? info.actions : info.actions.filter((action => !action.notApplicableReason));
      for (const action of relevantActions) {
        actions.push(asApplyRefactoring(action, info, args));
      }
    }
  }
  return actions;
}

function asSelectRefactoring(info, args) {
  return main$3.CodeAction.create(info.description, main$3.Command.create(info.description, Commands.SELECT_REFACTORING, info, args), main$3.CodeActionKind.Refactor);
}

function asApplyRefactoring(action, info, args) {
  const codeAction = main$3.CodeAction.create(action.description, asKind(info));
  if (action.notApplicableReason) {
    codeAction.disabled = {
      reason: action.notApplicableReason
    };
  } else {
    codeAction.command = main$3.Command.create(action.description, Commands.APPLY_REFACTORING, {
      ...args,
      refactor: info.name,
      action: action.name
    });
  }
  return codeAction;
}

function asKind(refactor) {
  if (refactor.name.startsWith('function_')) {
    return `${main$3.CodeActionKind.RefactorExtract}.function`;
  } else if (refactor.name.startsWith('constant_')) {
    return `${main$3.CodeActionKind.RefactorExtract}.constant`;
  } else if (refactor.name.startsWith('Move')) {
    return `${main$3.CodeActionKind.Refactor}.move`;
  }
  return main$3.CodeActionKind.Refactor;
}

class CodeActionKind {
  constructor(value) {
    this.value = value;
  }
  equals(other) {
    return this.value === other.value;
  }
  contains(other) {
    return this.equals(other) || this.value === '' || other.value.startsWith(this.value + CodeActionKind.sep);
  }
  intersects(other) {
    return this.contains(other) || other.contains(this);
  }
  append(part) {
    return new CodeActionKind(this.value + CodeActionKind.sep + part);
  }
}

CodeActionKind.sep = '.';

CodeActionKind.Empty = new CodeActionKind(main$3.CodeActionKind.Empty);

CodeActionKind.QuickFix = new CodeActionKind(main$3.CodeActionKind.QuickFix);

CodeActionKind.Refactor = new CodeActionKind(main$3.CodeActionKind.Refactor);

CodeActionKind.Source = new CodeActionKind(main$3.CodeActionKind.Source);

CodeActionKind.SourceAddMissingImportsTs = CodeActionKind.Source.append('addMissingImports').append('ts');

CodeActionKind.SourceFixAll = new CodeActionKind(main$3.CodeActionKind.SourceFixAll);

CodeActionKind.SourceFixAllTs = CodeActionKind.SourceFixAll.append('ts');

CodeActionKind.SourceOrganizeImports = new CodeActionKind(main$3.CodeActionKind.SourceOrganizeImports);

CodeActionKind.SourceOrganizeImportsTs = CodeActionKind.SourceOrganizeImports.append('ts');

CodeActionKind.SourceRemoveUnusedImportsTs = CodeActionKind.Source.append('removeUnusedImports').append('ts');

CodeActionKind.SourceRemoveUnusedTs = CodeActionKind.Source.append('removeUnused').append('ts');

CodeActionKind.SourceSortImportsTs = CodeActionKind.Source.append('sortImports').append('ts');

const organizeImportsCommand = {
  title: 'Organize Imports',
  kind: CodeActionKind.SourceOrganizeImportsTs,
  mode: OrganizeImportsMode.All
};

const sortImportsCommand = {
  minVersion: API.v430,
  title: 'Sort Imports',
  kind: CodeActionKind.SourceSortImportsTs,
  mode: OrganizeImportsMode.SortAndCombine
};

const removeUnusedImportsCommand = {
  minVersion: API.v490,
  title: 'Remove Unused Imports',
  kind: CodeActionKind.SourceRemoveUnusedImportsTs,
  mode: OrganizeImportsMode.RemoveUnused
};

const organizeImportsCommands = [ organizeImportsCommand, sortImportsCommand, removeUnusedImportsCommand ];

function provideOrganizeImports(command, response, client) {
  if (!response || response.body.length === 0) {
    return [];
  }
  return [ main$3.CodeAction.create(command.title, {
    documentChanges: response.body.map((edit => toTextDocumentEdit(edit, client)))
  }, command.kind.value) ];
}

function collectDocumentSymbols(parent, symbols) {
  return collectDocumentSymbolsInRange(parent, symbols, {
    start: Range.fromTextSpan(parent.spans[0]).start,
    end: Range.fromTextSpan(parent.spans[parent.spans.length - 1]).end
  });
}

function collectDocumentSymbolsInRange(parent, symbols, range) {
  let shouldInclude = shouldIncludeEntry(parent);
  for (const span of parent.spans) {
    const spanRange = Range.fromTextSpan(span);
    if (!Range.intersection(range, spanRange)) {
      continue;
    }
    const children = [];
    if (parent.childItems) {
      for (const child of parent.childItems) {
        if (child.spans.some((childSpan => !!Range.intersection(spanRange, Range.fromTextSpan(childSpan))))) {
          const includedChild = collectDocumentSymbolsInRange(child, children, spanRange);
          shouldInclude = shouldInclude || includedChild;
        }
      }
    }
    let selectionRange = spanRange;
    if (parent.nameSpan) {
      const nameRange = Range.fromTextSpan(parent.nameSpan);
      if (Range.intersection(spanRange, nameRange)) {
        selectionRange = nameRange;
      }
    }
    if (shouldInclude) {
      symbols.push({
        name: parent.text,
        detail: '',
        kind: toSymbolKind(parent.kind),
        range: spanRange,
        selectionRange: selectionRange,
        children: children
      });
    }
  }
  return shouldInclude;
}

function collectSymbolInformation(uri, current, symbols, containerName) {
  let shouldInclude = shouldIncludeEntry(current);
  const name = current.text;
  for (const span of current.spans) {
    const range = Range.fromTextSpan(span);
    const children = [];
    if (current.childItems) {
      for (const child of current.childItems) {
        if (child.spans.some((span => !!Range.intersection(range, Range.fromTextSpan(span))))) {
          const includedChild = collectSymbolInformation(uri, child, children, name);
          shouldInclude = shouldInclude || includedChild;
        }
      }
    }
    if (shouldInclude) {
      symbols.push({
        name: name,
        kind: toSymbolKind(current.kind),
        location: {
          uri: uri,
          range: range
        },
        containerName: containerName
      });
      symbols.push(...children);
    }
  }
  return shouldInclude;
}

function shouldIncludeEntry(item) {
  if (item.kind === ScriptElementKind.alias) {
    return false;
  }
  return !!(item.text && item.text !== '<function>' && item.text !== '<class>');
}

function fromProtocolCallHierarchyItem(item, client, workspaceRoot) {
  const useFileName = isSourceFileItem(item);
  const name = useFileName ? path__default.basename(item.file) : item.name;
  const detail = useFileName ? workspaceRoot ? path__default.relative(workspaceRoot, path__default.dirname(item.file)) : path__default.dirname(item.file) : item.containerName ?? '';
  const result = {
    kind: fromProtocolScriptElementKind(item.kind),
    name: name,
    detail: detail,
    uri: client.toResourceUri(item.file),
    range: Range.fromTextSpan(item.span),
    selectionRange: Range.fromTextSpan(item.selectionSpan)
  };
  const kindModifiers = item.kindModifiers ? parseKindModifier(item.kindModifiers) : undefined;
  if (kindModifiers?.has(ScriptElementKindModifier.deprecatedModifier)) {
    result.tags = [ main$3.SymbolTag.Deprecated ];
  }
  return result;
}

function fromProtocolCallHierarchyIncomingCall(item, client, workspaceRoot) {
  return {
    from: fromProtocolCallHierarchyItem(item.from, client, workspaceRoot),
    fromRanges: item.fromSpans.map(Range.fromTextSpan)
  };
}

function fromProtocolCallHierarchyOutgoingCall(item, client, workspaceRoot) {
  return {
    to: fromProtocolCallHierarchyItem(item.to, client, workspaceRoot),
    fromRanges: item.fromSpans.map(Range.fromTextSpan)
  };
}

function isSourceFileItem(item) {
  return item.kind === ScriptElementKind.scriptElement || item.kind === ScriptElementKind.moduleElement && item.selectionSpan.start.line === 1 && item.selectionSpan.start.offset === 1;
}

function fromProtocolScriptElementKind(kind) {
  switch (kind) {
   case ScriptElementKind.moduleElement:
    return main$3.SymbolKind.Module;

   case ScriptElementKind.classElement:
    return main$3.SymbolKind.Class;

   case ScriptElementKind.enumElement:
    return main$3.SymbolKind.Enum;

   case ScriptElementKind.enumMemberElement:
    return main$3.SymbolKind.EnumMember;

   case ScriptElementKind.interfaceElement:
    return main$3.SymbolKind.Interface;

   case ScriptElementKind.indexSignatureElement:
    return main$3.SymbolKind.Method;

   case ScriptElementKind.callSignatureElement:
    return main$3.SymbolKind.Method;

   case ScriptElementKind.memberFunctionElement:
    return main$3.SymbolKind.Method;

   case ScriptElementKind.memberVariableElement:
    return main$3.SymbolKind.Property;

   case ScriptElementKind.memberGetAccessorElement:
    return main$3.SymbolKind.Property;

   case ScriptElementKind.memberSetAccessorElement:
    return main$3.SymbolKind.Property;

   case ScriptElementKind.variableElement:
    return main$3.SymbolKind.Variable;

   case ScriptElementKind.letElement:
    return main$3.SymbolKind.Variable;

   case ScriptElementKind.constElement:
    return main$3.SymbolKind.Variable;

   case ScriptElementKind.localVariableElement:
    return main$3.SymbolKind.Variable;

   case ScriptElementKind.alias:
    return main$3.SymbolKind.Variable;

   case ScriptElementKind.functionElement:
    return main$3.SymbolKind.Function;

   case ScriptElementKind.localFunctionElement:
    return main$3.SymbolKind.Function;

   case ScriptElementKind.constructSignatureElement:
    return main$3.SymbolKind.Constructor;

   case ScriptElementKind.constructorImplementationElement:
    return main$3.SymbolKind.Constructor;

   case ScriptElementKind.typeParameterElement:
    return main$3.SymbolKind.TypeParameter;

   case ScriptElementKind.string:
    return main$3.SymbolKind.String;

   default:
    return main$3.SymbolKind.Variable;
  }
}

function parseKindModifier(kindModifiers) {
  return new Set(kindModifiers.split(/,|\s+/g));
}

var isMergeableObject = function isMergeableObject(value) {
  return isNonNullObject(value) && !isSpecial(value);
};

function isNonNullObject(value) {
  return !!value && typeof value === 'object';
}

function isSpecial(value) {
  var stringValue = Object.prototype.toString.call(value);
  return stringValue === '[object RegExp]' || stringValue === '[object Date]' || isReactElement(value);
}

var canUseSymbol = typeof Symbol === 'function' && Symbol.for;

var REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for('react.element') : 60103;

function isReactElement(value) {
  return value.$$typeof === REACT_ELEMENT_TYPE;
}

function emptyTarget(val) {
  return Array.isArray(val) ? [] : {};
}

function cloneUnlessOtherwiseSpecified(value, options) {
  return options.clone !== false && options.isMergeableObject(value) ? deepmerge(emptyTarget(value), value, options) : value;
}

function defaultArrayMerge(target, source, options) {
  return target.concat(source).map((function(element) {
    return cloneUnlessOtherwiseSpecified(element, options);
  }));
}

function getMergeFunction(key, options) {
  if (!options.customMerge) {
    return deepmerge;
  }
  var customMerge = options.customMerge(key);
  return typeof customMerge === 'function' ? customMerge : deepmerge;
}

function getEnumerableOwnPropertySymbols(target) {
  return Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(target).filter((function(symbol) {
    return Object.propertyIsEnumerable.call(target, symbol);
  })) : [];
}

function getKeys(target) {
  return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target));
}

function propertyIsOnObject(object, property) {
  try {
    return property in object;
  } catch (_) {
    return false;
  }
}

function propertyIsUnsafe(target, key) {
  return propertyIsOnObject(target, key) && !(Object.hasOwnProperty.call(target, key) && Object.propertyIsEnumerable.call(target, key));
}

function mergeObject(target, source, options) {
  var destination = {};
  if (options.isMergeableObject(target)) {
    getKeys(target).forEach((function(key) {
      destination[key] = cloneUnlessOtherwiseSpecified(target[key], options);
    }));
  }
  getKeys(source).forEach((function(key) {
    if (propertyIsUnsafe(target, key)) {
      return;
    }
    if (propertyIsOnObject(target, key) && options.isMergeableObject(source[key])) {
      destination[key] = getMergeFunction(key, options)(target[key], source[key], options);
    } else {
      destination[key] = cloneUnlessOtherwiseSpecified(source[key], options);
    }
  }));
  return destination;
}

function deepmerge(target, source, options) {
  options = options || {};
  options.arrayMerge = options.arrayMerge || defaultArrayMerge;
  options.isMergeableObject = options.isMergeableObject || isMergeableObject;
  options.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;
  var sourceIsArray = Array.isArray(source);
  var targetIsArray = Array.isArray(target);
  var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;
  if (!sourceAndTargetTypesMatch) {
    return cloneUnlessOtherwiseSpecified(source, options);
  } else if (sourceIsArray) {
    return options.arrayMerge(target, source, options);
  } else {
    return mergeObject(target, source, options);
  }
}

deepmerge.all = function deepmergeAll(array, options) {
  if (!Array.isArray(array)) {
    throw new Error('first argument should be an array');
  }
  return array.reduce((function(prev, next) {
    return deepmerge(prev, next, options);
  }), {});
};

var deepmerge_1 = deepmerge;

var cjs$1 = deepmerge_1;

const deepmerge$1 = getDefaultExportFromCjs(cjs$1);

function equals(one, other) {
  if (one === other) {
    return true;
  }
  if (one === null || one === undefined || other === null || other === undefined) {
    return false;
  }
  if (typeof one !== typeof other) {
    return false;
  }
  if (typeof one !== 'object') {
    return false;
  }
  if (Array.isArray(one) !== Array.isArray(other)) {
    return false;
  }
  if (Array.isArray(one)) {
    return equals$1(one, other, equals);
  } else {
    const oneKeys = [];
    for (const key in one) {
      oneKeys.push(key);
    }
    oneKeys.sort();
    const otherKeys = [];
    for (const key in other) {
      otherKeys.push(key);
    }
    otherKeys.sort();
    if (!equals$1(oneKeys, otherKeys)) {
      return false;
    }
    return oneKeys.every((key => equals(one[key], other[key])));
  }
}

function getInferredProjectCompilerOptions(version, workspaceConfig) {
  const projectConfig = {
    module: ModuleKind.ESNext,
    moduleResolution: ModuleResolutionKind.Node,
    target: ScriptTarget.ES2022,
    jsx: JsxEmit.React
  };
  if (version.gte(API.v500)) {
    projectConfig.allowImportingTsExtensions = true;
  }
  if (workspaceConfig.checkJs) {
    projectConfig.checkJs = true;
    projectConfig.allowJs = true;
  }
  if (workspaceConfig.experimentalDecorators) {
    projectConfig.experimentalDecorators = true;
  }
  if (workspaceConfig.strictNullChecks) {
    projectConfig.strictNullChecks = true;
  }
  if (workspaceConfig.strictFunctionTypes) {
    projectConfig.strictFunctionTypes = true;
  }
  if (workspaceConfig.module) {
    projectConfig.module = workspaceConfig.module;
  }
  if (workspaceConfig.target) {
    projectConfig.target = workspaceConfig.target;
  }
  projectConfig.sourceMap = true;
  return projectConfig;
}

const DEFAULT_TSSERVER_PREFERENCES = {
  allowIncompleteCompletions: true,
  allowRenameOfImportPath: true,
  allowTextChangesInNewFiles: true,
  autoImportFileExcludePatterns: [],
  disableLineTextInReferences: true,
  disableSuggestions: false,
  displayPartsForJSDoc: true,
  excludeLibrarySymbolsInNavTo: true,
  generateReturnInDocTemplate: true,
  importModuleSpecifierEnding: 'auto',
  importModuleSpecifierPreference: 'shortest',
  includeAutomaticOptionalChainCompletions: true,
  includeCompletionsForImportStatements: true,
  includeCompletionsForModuleExports: true,
  includeCompletionsWithClassMemberSnippets: true,
  includeCompletionsWithInsertText: true,
  includeCompletionsWithObjectLiteralMethodSnippets: true,
  includeCompletionsWithSnippetText: true,
  includeInlayEnumMemberValueHints: false,
  includeInlayFunctionLikeReturnTypeHints: false,
  includeInlayFunctionParameterTypeHints: false,
  includeInlayParameterNameHints: 'none',
  includeInlayParameterNameHintsWhenArgumentMatchesName: false,
  includeInlayPropertyDeclarationTypeHints: false,
  includeInlayVariableTypeHints: false,
  includeInlayVariableTypeHintsWhenTypeMatchesName: false,
  includePackageJsonAutoImports: 'auto',
  interactiveInlayHints: true,
  jsxAttributeCompletionStyle: 'auto',
  lazyConfiguredProjectsFromExternalProject: false,
  organizeImportsAccentCollation: true,
  organizeImportsCaseFirst: false,
  organizeImportsCollation: 'ordinal',
  organizeImportsCollationLocale: 'en',
  organizeImportsIgnoreCase: 'auto',
  organizeImportsNumericCollation: false,
  providePrefixAndSuffixTextForRename: true,
  provideRefactorNotApplicableReason: true,
  quotePreference: 'auto',
  useLabelDetailsInCompletionEntries: true
};

const DEFAULT_IMPLICIT_PROJECT_CONFIGURATION = {
  checkJs: false,
  experimentalDecorators: false,
  module: ModuleKind.ESNext,
  strictFunctionTypes: true,
  strictNullChecks: true,
  target: ScriptTarget.ES2020
};

const DEFAULT_WORKSPACE_CONFIGURATION = {
  implicitProjectConfiguration: DEFAULT_IMPLICIT_PROJECT_CONFIGURATION
};

function areFileConfigurationsEqual(a, b) {
  return equals(a, b);
}

class FileConfigurationManager {
  constructor(client, onCaseInsensitiveFileSystem) {
    this.client = client;
    this.tsPreferences = deepmerge$1({}, DEFAULT_TSSERVER_PREFERENCES);
    this.workspaceConfiguration = deepmerge$1({}, DEFAULT_WORKSPACE_CONFIGURATION);
    this.formatOptions = new ResourceMap(undefined, {
      onCaseInsensitiveFileSystem: onCaseInsensitiveFileSystem
    });
  }
  onDidCloseTextDocument(documentUri) {
    this.formatOptions.delete(documentUri);
  }
  mergeTsPreferences(preferences) {
    this.tsPreferences = deepmerge$1(this.tsPreferences, preferences);
  }
  setWorkspaceConfiguration(configuration) {
    this.workspaceConfiguration = deepmerge$1(DEFAULT_WORKSPACE_CONFIGURATION, configuration);
    this.setCompilerOptionsForInferredProjects();
  }
  setGlobalConfiguration(workspaceFolder, hostInfo) {
    const formatOptions = {
      newLineCharacter: '\n'
    };
    this.client.executeWithoutWaitingForResponse(CommandTypes.Configure, {
      ...hostInfo ? {
        hostInfo: hostInfo
      } : {},
      formatOptions: formatOptions,
      preferences: {
        ...this.tsPreferences,
        autoImportFileExcludePatterns: this.getAutoImportFileExcludePatternsPreference(workspaceFolder)
      }
    });
    this.setCompilerOptionsForInferredProjects();
  }
  setCompilerOptionsForInferredProjects() {
    this.client.executeWithoutWaitingForResponse(CommandTypes.CompilerOptionsForInferredProjects, {
      options: {
        ...getInferredProjectCompilerOptions(this.client.apiVersion, this.workspaceConfiguration.implicitProjectConfiguration),
        allowJs: true,
        allowNonTsExtensions: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true
      }
    });
  }
  async ensureConfigurationForDocument(document, token) {
    return this.ensureConfigurationOptions(document, undefined, token);
  }
  async ensureConfigurationOptions(document, options, token) {
    const currentOptions = this.getFileOptions(document, options);
    const cachedOptions = this.formatOptions.get(document.uri);
    if (cachedOptions) {
      const cachedOptionsValue = await cachedOptions;
      if (token?.isCancellationRequested) {
        return;
      }
      if (cachedOptionsValue && areFileConfigurationsEqual(cachedOptionsValue, currentOptions)) {
        return;
      }
    }
    const task = (async () => {
      try {
        const response = await this.client.execute(CommandTypes.Configure, {
          file: document.filepath,
          ...currentOptions
        }, token);
        return response.type === 'response' ? currentOptions : undefined;
      } catch {
        return undefined;
      }
    })();
    this.formatOptions.set(document.uri, task);
    await task;
  }
  async setGlobalConfigurationFromDocument(document, token) {
    const args = {
      file: undefined,
      ...this.getFileOptions(document)
    };
    await this.client.execute(CommandTypes.Configure, args, token);
  }
  reset() {
    this.formatOptions.clear();
  }
  getFileOptions(document, options) {
    return {
      formatOptions: this.getFormatOptions(document, options),
      preferences: this.getPreferences(document)
    };
  }
  getFormatOptions(document, formattingOptions) {
    const workspacePreferences = this.getWorkspacePreferencesForFile(document);
    const opts = {
      ...workspacePreferences?.format,
      ...formattingOptions
    };
    if (opts.convertTabsToSpaces === undefined) {
      opts.convertTabsToSpaces = formattingOptions?.insertSpaces;
    }
    if (opts.indentSize === undefined) {
      opts.indentSize = formattingOptions?.tabSize;
    }
    if (opts.newLineCharacter === undefined) {
      opts.newLineCharacter = '\n';
    }
    return opts;
  }
  getWorkspacePreferencesForFile(document) {
    return this.workspaceConfiguration[isTypeScriptDocument(document) ? 'typescript' : 'javascript'] || {};
  }
  getPreferences(document) {
    const workspacePreferences = this.getWorkspacePreferencesForFile(document);
    const preferences = Object.assign({}, this.tsPreferences, workspacePreferences?.inlayHints || {});
    return {
      ...preferences,
      quotePreference: this.getQuoteStylePreference(preferences)
    };
  }
  getQuoteStylePreference(preferences) {
    switch (preferences.quotePreference) {
     case 'single':
      return 'single';

     case 'double':
      return 'double';

     default:
      return this.client.apiVersion.gte(API.v333) ? 'auto' : undefined;
    }
  }
  getAutoImportFileExcludePatternsPreference(workspaceFolder) {
    if (!workspaceFolder || this.tsPreferences.autoImportFileExcludePatterns.length === 0) {
      return;
    }
    return this.tsPreferences.autoImportFileExcludePatterns.map((p => {
      const slashNormalized = p.replace(/\\/g, '/');
      const isRelative = /^\.\.?($|\/)/.test(slashNormalized);
      return path__default.posix.isAbsolute(p) ? p : p.startsWith('*') ? `/${slashNormalized}` : isRelative ? path__default.posix.join(workspaceFolder, p) : `/**/${slashNormalized}`;
    }));
  }
}

const variableDeclaredButNeverUsed = new Set([ 6196, 6133 ]);

const unreachableCode$1 = new Set([ 7027 ]);

const incorrectlyImplementsInterface = new Set([ 2420 ]);

const cannotFindName = new Set([ 2552, 2304 ]);

const asyncOnlyAllowedInAsyncFunctions = new Set([ 1308 ]);

const awaitInSyncFunction = 'fixAwaitInSyncFunction';

const classIncorrectlyImplementsInterface = 'fixClassIncorrectlyImplementsInterface';

const unreachableCode = 'fixUnreachableCode';

const unusedIdentifier = 'unusedIdentifier';

const fixImport = 'import';

async function buildIndividualFixes(fixes, client, file, diagnostics) {
  const edits = [];
  for (const diagnostic of diagnostics) {
    for (const {codes: codes, fixName: fixName} of fixes) {
      if (!codes.has(diagnostic.code)) {
        continue;
      }
      const args = {
        ...Range.toFileRangeRequestArgs(file, diagnostic.range),
        errorCodes: [ +diagnostic.code ]
      };
      const response = await client.execute(CommandTypes.GetCodeFixes, args);
      if (response.type !== 'response') {
        continue;
      }
      const fix = response.body?.find((fix => fix.fixName === fixName));
      if (fix) {
        edits.push(...fix.changes.map((change => toTextDocumentEdit(change, client))));
        break;
      }
    }
  }
  return edits;
}

async function buildCombinedFix(fixes, client, file, diagnostics) {
  const edits = [];
  for (const diagnostic of diagnostics) {
    for (const {codes: codes, fixName: fixName} of fixes) {
      if (!codes.has(diagnostic.code)) {
        continue;
      }
      const args = {
        ...Range.toFileRangeRequestArgs(file, diagnostic.range),
        errorCodes: [ +diagnostic.code ]
      };
      const response = await client.execute(CommandTypes.GetCodeFixes, args);
      if (response.type !== 'response' || !response.body?.length) {
        continue;
      }
      const fix = response.body?.find((fix => fix.fixName === fixName));
      if (!fix) {
        continue;
      }
      if (!fix.fixId) {
        edits.push(...fix.changes.map((change => toTextDocumentEdit(change, client))));
        return edits;
      }
      const combinedArgs = {
        scope: {
          type: 'file',
          args: {
            file: file
          }
        },
        fixId: fix.fixId
      };
      const combinedResponse = await client.execute(CommandTypes.GetCombinedCodeFix, combinedArgs);
      if (combinedResponse.type !== 'response' || !combinedResponse.body) {
        return edits;
      }
      edits.push(...combinedResponse.body.changes.map((change => toTextDocumentEdit(change, client))));
      return edits;
    }
  }
  return edits;
}

class SourceAction {}

class SourceFixAll extends SourceAction {
  constructor() {
    super(...arguments);
    this.title = 'Fix all';
  }
  async build(client, file, diagnostics) {
    const edits = [];
    edits.push(...await buildIndividualFixes([ {
      codes: incorrectlyImplementsInterface,
      fixName: classIncorrectlyImplementsInterface
    }, {
      codes: asyncOnlyAllowedInAsyncFunctions,
      fixName: awaitInSyncFunction
    } ], client, file, diagnostics));
    edits.push(...await buildCombinedFix([ {
      codes: unreachableCode$1,
      fixName: unreachableCode
    } ], client, file, diagnostics));
    if (!edits.length) {
      return null;
    }
    return main$3.CodeAction.create(this.title, {
      documentChanges: edits
    }, SourceFixAll.kind.value);
  }
}

SourceFixAll.kind = CodeActionKind.SourceFixAllTs;

class SourceRemoveUnused extends SourceAction {
  constructor() {
    super(...arguments);
    this.title = 'Remove all unused code';
  }
  async build(client, file, diagnostics) {
    const edits = await buildCombinedFix([ {
      codes: variableDeclaredButNeverUsed,
      fixName: unusedIdentifier
    } ], client, file, diagnostics);
    if (!edits.length) {
      return null;
    }
    return main$3.CodeAction.create(this.title, {
      documentChanges: edits
    }, SourceRemoveUnused.kind.value);
  }
}

SourceRemoveUnused.kind = CodeActionKind.SourceRemoveUnusedTs;

class SourceAddMissingImports extends SourceAction {
  constructor() {
    super(...arguments);
    this.title = 'Add all missing imports';
  }
  async build(client, file, diagnostics) {
    const edits = await buildCombinedFix([ {
      codes: cannotFindName,
      fixName: fixImport
    } ], client, file, diagnostics);
    if (!edits.length) {
      return null;
    }
    return main$3.CodeAction.create(this.title, {
      documentChanges: edits
    }, SourceAddMissingImports.kind.value);
  }
}

SourceAddMissingImports.kind = CodeActionKind.SourceAddMissingImportsTs;

class TypeScriptAutoFixProvider {
  static get kinds() {
    return TypeScriptAutoFixProvider.kindProviders.map((provider => provider.kind));
  }
  constructor(client) {
    this.client = client;
  }
  async provideCodeActions(kinds, file, diagnostics) {
    const results = [];
    for (const provider of TypeScriptAutoFixProvider.kindProviders) {
      if (kinds.some((kind => kind.contains(provider.kind)))) {
        results.push((new provider).build(this.client, file, diagnostics));
      }
    }
    return (await Promise.all(results)).flatMap((result => result || []));
  }
}

TypeScriptAutoFixProvider.kindProviders = [ SourceFixAll, SourceRemoveUnused, SourceAddMissingImports ];

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

var CodeLensType;

(function(CodeLensType) {
  CodeLensType[CodeLensType['Reference'] = 0] = 'Reference';
  CodeLensType[CodeLensType['Implementation'] = 1] = 'Implementation';
})(CodeLensType || (CodeLensType = {}));

class TypeScriptBaseCodeLensProvider {
  constructor(client, cachedResponse, fileConfigurationManager) {
    this.client = client;
    this.cachedResponse = cachedResponse;
    this.fileConfigurationManager = fileConfigurationManager;
  }
  async provideCodeLenses(document, token) {
    const configuration = this.fileConfigurationManager.getWorkspacePreferencesForFile(document);
    if (this.type === CodeLensType.Implementation && !configuration.implementationsCodeLens?.enabled || this.type === CodeLensType.Reference && !configuration.referencesCodeLens?.enabled) {
      return [];
    }
    const response = await this.cachedResponse.execute(document, (() => this.client.execute(CommandTypes.NavTree, {
      file: document.filepath
    }, token)));
    if (response.type !== 'response') {
      return [];
    }
    const referenceableSpans = [];
    response.body?.childItems?.forEach((item => this.walkNavTree(document, item, undefined, referenceableSpans)));
    return referenceableSpans.map((span => main$2.CodeLens.create(span, {
      uri: document.uri.toString(),
      type: this.type
    })));
  }
  walkNavTree(document, item, parent, results) {
    const range = this.extractSymbol(document, item, parent);
    if (range) {
      results.push(range);
    }
    item.childItems?.forEach((child => this.walkNavTree(document, child, item, results)));
  }
}

TypeScriptBaseCodeLensProvider.cancelledCommand = {
  title: '',
  command: ''
};

TypeScriptBaseCodeLensProvider.errorCommand = {
  title: 'Could not determine references',
  command: ''
};

function getSymbolRange(document, item) {
  if (item.nameSpan) {
    return Range.fromTextSpan(item.nameSpan);
  }
  const span = item.spans?.[0];
  if (!span) {
    return undefined;
  }
  const range = Range.fromTextSpan(span);
  const text = document.getText(range);
  const identifierMatch = new RegExp(`^(.*?(\\b|\\W))${escapeRegExp(item.text || '')}(\\b|\\W)`, 'gm');
  const match = identifierMatch.exec(text);
  const prefixLength = match ? match.index + match[1].length : 0;
  const startOffset = document.offsetAt(range.start) + prefixLength;
  return main$2.Range.create(document.positionAt(startOffset), document.positionAt(startOffset + item.text.length));
}

class TypeScriptImplementationsCodeLensProvider extends TypeScriptBaseCodeLensProvider {
  get type() {
    return CodeLensType.Implementation;
  }
  async resolveCodeLens(codeLens, token) {
    const document = this.client.toOpenDocument(codeLens.data.uri);
    if (!document) {
      return codeLens;
    }
    if (!this.fileConfigurationManager.getWorkspacePreferencesForFile(document).implementationsCodeLens?.enabled) {
      return codeLens;
    }
    const args = Position.toFileLocationRequestArgs(document.filepath, codeLens.range.start);
    const response = await this.client.execute(CommandTypes.Implementation, args, token, {
      lowPriority: true,
      executionTarget: ExecutionTarget.Semantic,
      cancelOnResourceChange: codeLens.data.uri
    });
    if (response.type !== 'response' || !response.body) {
      codeLens.command = response.type === 'cancelled' ? TypeScriptBaseCodeLensProvider.cancelledCommand : TypeScriptBaseCodeLensProvider.errorCommand;
      return codeLens;
    }
    const locations = response.body.map((reference => main$2.Location.create(this.client.toResourceUri(reference.file), reference.start.line === reference.end.line ? Range.fromTextSpan(reference) : main$2.Range.create(Position.fromLocation(reference.start), main$2.Position.create(reference.start.line, 0))))).filter((location => !(location.uri.toString() === codeLens.data.uri && location.range.start.line === codeLens.range.start.line && location.range.start.character === codeLens.range.start.character)));
    codeLens.command = this.getCommand(locations, codeLens);
    return codeLens;
  }
  getCommand(locations, codeLens) {
    return {
      title: this.getTitle(locations),
      command: locations.length ? 'editor.action.showReferences' : '',
      arguments: [ codeLens.data.uri, codeLens.range.start, locations ]
    };
  }
  getTitle(locations) {
    return locations.length === 1 ? '1 implementation' : `${locations.length} implementations`;
  }
  extractSymbol(document, item, _parent) {
    switch (item.kind) {
     case ScriptElementKind.interfaceElement:
      return getSymbolRange(document, item);

     case ScriptElementKind.classElement:
     case ScriptElementKind.memberFunctionElement:
     case ScriptElementKind.memberVariableElement:
     case ScriptElementKind.memberGetAccessorElement:
     case ScriptElementKind.memberSetAccessorElement:
      if (item.kindModifiers.match(/\babstract\b/g)) {
        return getSymbolRange(document, item);
      }
      break;
    }
    return undefined;
  }
}

class TypeScriptReferencesCodeLensProvider extends TypeScriptBaseCodeLensProvider {
  get type() {
    return CodeLensType.Reference;
  }
  async resolveCodeLens(codeLens, token) {
    const document = this.client.toOpenDocument(codeLens.data.uri);
    if (!document) {
      return codeLens;
    }
    if (!this.fileConfigurationManager.getWorkspacePreferencesForFile(document).referencesCodeLens?.enabled) {
      return codeLens;
    }
    const args = Position.toFileLocationRequestArgs(document.filepath, codeLens.range.start);
    const response = await this.client.execute(CommandTypes.References, args, token, {
      lowPriority: true,
      executionTarget: ExecutionTarget.Semantic,
      cancelOnResourceChange: codeLens.data.uri
    });
    if (response.type !== 'response' || !response.body) {
      codeLens.command = response.type === 'cancelled' ? TypeScriptBaseCodeLensProvider.cancelledCommand : TypeScriptBaseCodeLensProvider.errorCommand;
      return codeLens;
    }
    const locations = response.body.refs.filter((reference => !reference.isDefinition)).map((reference => Location.fromTextSpan(this.client.toResourceUri(reference.file), reference)));
    codeLens.command = {
      title: this.getCodeLensLabel(locations),
      command: locations.length ? 'editor.action.showReferences' : '',
      arguments: [ codeLens.data.uri, codeLens.range.start, locations ]
    };
    return codeLens;
  }
  getCodeLensLabel(locations) {
    return locations.length === 1 ? '1 reference' : `${locations.length} references`;
  }
  extractSymbol(document, item, parent) {
    if (parent && parent.kind === ScriptElementKind.enumElement) {
      return getSymbolRange(document, item);
    }
    switch (item.kind) {
     case ScriptElementKind.functionElement:
      {
        const showOnAllFunctions = this.fileConfigurationManager.getWorkspacePreferencesForFile(document).referencesCodeLens?.showOnAllFunctions;
        if (showOnAllFunctions) {
          return getSymbolRange(document, item);
        }
      }

     case ScriptElementKind.constElement:
     case ScriptElementKind.letElement:
     case ScriptElementKind.variableElement:
      if (/\bexport\b/.test(item.kindModifiers)) {
        return getSymbolRange(document, item);
      }
      break;

     case ScriptElementKind.classElement:
      if (item.text === '<class>') {
        break;
      }
      return getSymbolRange(document, item);

     case ScriptElementKind.interfaceElement:
     case ScriptElementKind.typeElement:
     case ScriptElementKind.enumElement:
      return getSymbolRange(document, item);

     case ScriptElementKind.memberFunctionElement:
     case ScriptElementKind.memberGetAccessorElement:
     case ScriptElementKind.memberSetAccessorElement:
     case ScriptElementKind.constructorImplementationElement:
     case ScriptElementKind.memberVariableElement:
      if (parent && Position.isEqual(Position.fromLocation(parent.spans[0].start), Position.fromLocation(item.spans[0].start))) {
        return undefined;
      }
      switch (parent?.kind) {
       case ScriptElementKind.classElement:
       case ScriptElementKind.interfaceElement:
       case ScriptElementKind.typeElement:
        return getSymbolRange(document, item);
      }
      break;
    }
    return undefined;
  }
}

class TypeScriptInlayHintsProvider {
  static async provideInlayHints(textDocument, range, client, lspClient, fileConfigurationManager, token) {
    if (client.apiVersion.lt(TypeScriptInlayHintsProvider.minVersion)) {
      lspClient.showErrorMessage('Inlay Hints request failed. Requires TypeScript 4.4+.');
      return [];
    }
    const document = client.toOpenDocument(textDocument.uri);
    if (!document) {
      lspClient.showErrorMessage('Inlay Hints request failed. File not opened in the editor.');
      return [];
    }
    if (!areInlayHintsEnabledForFile(fileConfigurationManager, document)) {
      return [];
    }
    await fileConfigurationManager.ensureConfigurationForDocument(document, token);
    if (token?.isCancellationRequested) {
      return [];
    }
    const start = document.offsetAt(range.start);
    const length = document.offsetAt(range.end) - start;
    const response = await client.execute(CommandTypes.ProvideInlayHints, {
      file: document.filepath,
      start: start,
      length: length
    }, token);
    if (response.type !== 'response' || !response.success || !response.body) {
      return [];
    }
    return response.body.map((hint => {
      const inlayHint = main$3.InlayHint.create(Position.fromLocation(hint.position), TypeScriptInlayHintsProvider.convertInlayHintText(hint, client), fromProtocolInlayHintKind(hint.kind));
      hint.whitespaceBefore && (inlayHint.paddingLeft = true);
      hint.whitespaceAfter && (inlayHint.paddingRight = true);
      return inlayHint;
    }));
  }
  static convertInlayHintText(tsHint, filePathConverter) {
    if (tsHint.displayParts) {
      return tsHint.displayParts.map((part => {
        const out = main$3.InlayHintLabelPart.create(part.text);
        if (part.span) {
          out.location = Location.fromTextSpan(filePathConverter.toResource(part.span.file).toString(), part.span);
        }
        return out;
      }));
    }
    return tsHint.text;
  }
}

TypeScriptInlayHintsProvider.minVersion = API.v440;

function areInlayHintsEnabledForFile(fileConfigurationManager, document) {
  const preferences = fileConfigurationManager.getPreferences(document);
  return preferences.includeInlayParameterNameHints === 'literals' || preferences.includeInlayParameterNameHints === 'all' || preferences.includeInlayEnumMemberValueHints || preferences.includeInlayFunctionLikeReturnTypeHints || preferences.includeInlayFunctionParameterTypeHints || preferences.includeInlayPropertyDeclarationTypeHints || preferences.includeInlayVariableTypeHints;
}

function fromProtocolInlayHintKind(kind) {
  switch (kind) {
   case 'Parameter':
    return main$3.InlayHintKind.Parameter;

   case 'Type':
    return main$3.InlayHintKind.Type;

   case 'Enum':
    return undefined;

   default:
    return undefined;
  }
}

var TokenEncodingConsts;

(function(TokenEncodingConsts) {
  TokenEncodingConsts[TokenEncodingConsts['typeOffset'] = 8] = 'typeOffset';
  TokenEncodingConsts[TokenEncodingConsts['modifierMask'] = 255] = 'modifierMask';
})(TokenEncodingConsts || (TokenEncodingConsts = {}));

function transformSpans(doc, spans) {
  const lspSpans = [];
  let previousLine = 0;
  let previousTokenStart = 0;
  for (let i = 0; i < spans.length; i += 3) {
    const tokenStart = spans[i];
    const tokenLength = spans[i + 1];
    const tokenTypeBitSet = spans[i + 2];
    const tokenModifier = tokenTypeBitSet & TokenEncodingConsts.modifierMask;
    const tokenType = (tokenTypeBitSet >> TokenEncodingConsts.typeOffset) - 1;
    const {line: line, character: character} = doc.positionAt(tokenStart);
    const deltaLine = line - previousLine;
    const deltaStart = previousLine === line ? character - previousTokenStart : character;
    lspSpans.push(deltaLine, deltaStart, tokenLength, tokenType, tokenModifier);
    previousTokenStart = character;
    previousLine = line;
  }
  return lspSpans;
}

class CachedResponse {
  constructor() {
    this.version = -1;
    this.document = '';
  }
  execute(document, resolve) {
    if (this.response && this.matches(document)) {
      return this.response = this.response.then((result => result.type === 'cancelled' ? resolve() : result));
    }
    return this.reset(document, resolve);
  }
  onDocumentClose(document) {
    if (this.document === document.uri.toString()) {
      this.response = undefined;
      this.version = -1;
      this.document = '';
    }
  }
  matches(document) {
    return this.version === document.version && this.document === document.uri.toString();
  }
  async reset(document, resolve) {
    this.version = document.version;
    this.document = document.uri.toString();
    return this.response = resolve();
  }
}

class LogDirectoryProvider {
  constructor(rootPath) {
    this.rootPath = rootPath;
  }
  getNewLogDirectory() {
    const root = this.logDirectory();
    if (root) {
      try {
        return fs$l.mkdtempSync(path__default.join(root, 'tsserver-log-'));
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  }
  logDirectory() {
    if (!this.rootPath) {
      return undefined;
    }
    try {
      if (!fs$l.existsSync(this.rootPath)) {
        fs$l.mkdirSync(this.rootPath);
      }
      return this.rootPath;
    } catch {
      return undefined;
    }
  }
}

var cjs = {};

var posix$1 = {};

Object.defineProperty(posix$1, '__esModule', {
  value: true
});

posix$1.sync = posix$1.isexe = void 0;

const fs_1$1 = require$$0$1;

const promises_1$1 = require$$1$2;

const isexe$2 = async (path, options = {}) => {
  const {ignoreErrors: ignoreErrors = false} = options;
  try {
    return checkStat$1(await (0, promises_1$1.stat)(path), options);
  } catch (e) {
    const er = e;
    if (ignoreErrors || er.code === 'EACCES') return false;
    throw er;
  }
};

posix$1.isexe = isexe$2;

const sync$1 = (path, options = {}) => {
  const {ignoreErrors: ignoreErrors = false} = options;
  try {
    return checkStat$1((0, fs_1$1.statSync)(path), options);
  } catch (e) {
    const er = e;
    if (ignoreErrors || er.code === 'EACCES') return false;
    throw er;
  }
};

posix$1.sync = sync$1;

const checkStat$1 = (stat, options) => stat.isFile() && checkMode(stat, options);

const checkMode = (stat, options) => {
  const myUid = options.uid ?? process.getuid?.();
  const myGroups = options.groups ?? process.getgroups?.() ?? [];
  const myGid = options.gid ?? process.getgid?.() ?? myGroups[0];
  if (myUid === undefined || myGid === undefined) {
    throw new Error('cannot get uid or gid');
  }
  const groups = new Set([ myGid, ...myGroups ]);
  const mod = stat.mode;
  const uid = stat.uid;
  const gid = stat.gid;
  const u = parseInt('100', 8);
  const g = parseInt('010', 8);
  const o = parseInt('001', 8);
  const ug = u | g;
  return !!(mod & o || mod & g && groups.has(gid) || mod & u && uid === myUid || mod & ug && myUid === 0);
};

var win32 = {};

Object.defineProperty(win32, '__esModule', {
  value: true
});

win32.sync = win32.isexe = void 0;

const fs_1 = require$$0$1;

const promises_1 = require$$1$2;

const isexe$1 = async (path, options = {}) => {
  const {ignoreErrors: ignoreErrors = false} = options;
  try {
    return checkStat(await (0, promises_1.stat)(path), path, options);
  } catch (e) {
    const er = e;
    if (ignoreErrors || er.code === 'EACCES') return false;
    throw er;
  }
};

win32.isexe = isexe$1;

const sync = (path, options = {}) => {
  const {ignoreErrors: ignoreErrors = false} = options;
  try {
    return checkStat((0, fs_1.statSync)(path), path, options);
  } catch (e) {
    const er = e;
    if (ignoreErrors || er.code === 'EACCES') return false;
    throw er;
  }
};

win32.sync = sync;

const checkPathExt = (path, options) => {
  const {pathExt: pathExt = process.env.PATHEXT || ''} = options;
  const peSplit = pathExt.split(';');
  if (peSplit.indexOf('') !== -1) {
    return true;
  }
  for (let i = 0; i < peSplit.length; i++) {
    const p = peSplit[i].toLowerCase();
    const ext = path.substring(path.length - p.length).toLowerCase();
    if (p && ext === p) {
      return true;
    }
  }
  return false;
};

const checkStat = (stat, path, options) => stat.isFile() && checkPathExt(path, options);

var options$1 = {};

Object.defineProperty(options$1, '__esModule', {
  value: true
});

(function(exports) {
  var __createBinding = commonjsGlobal && commonjsGlobal.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = {
        enumerable: true,
        get: function() {
          return m[k];
        }
      };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = commonjsGlobal && commonjsGlobal.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, 'default', {
      enumerable: true,
      value: v
    });
  } : function(o, v) {
    o['default'] = v;
  });
  var __importStar = commonjsGlobal && commonjsGlobal.__importStar || function(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
  var __exportStar = commonjsGlobal && commonjsGlobal.__exportStar || function(m, exports) {
    for (var p in m) if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
  };
  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  exports.sync = exports.isexe = exports.posix = exports.win32 = void 0;
  const posix = __importStar(posix$1);
  exports.posix = posix;
  const win32$1 = __importStar(win32);
  exports.win32 = win32$1;
  __exportStar(options$1, exports);
  const platform = process.env._ISEXE_TEST_PLATFORM_ || process.platform;
  const impl = platform === 'win32' ? win32$1 : posix;
  exports.isexe = impl.isexe;
  exports.sync = impl.sync;
})(cjs);

const {isexe: isexe, sync: isexeSync} = cjs;

const {join: join, delimiter: delimiter, sep: sep, posix: posix} = require$$1$1;

const isWindows = process.platform === 'win32';

const rSlash = new RegExp(`[${posix.sep}${sep === posix.sep ? '' : sep}]`.replace(/(\\)/g, '\\$1'));

const rRel = new RegExp(`^\\.${rSlash.source}`);

const getNotFoundError = cmd => Object.assign(new Error(`not found: ${cmd}`), {
  code: 'ENOENT'
});

const getPathInfo = (cmd, {path: optPath = process.env.PATH, pathExt: optPathExt = process.env.PATHEXT, delimiter: optDelimiter = delimiter}) => {
  const pathEnv = cmd.match(rSlash) ? [ '' ] : [ ...isWindows ? [ process.cwd() ] : [], ...(optPath || '').split(optDelimiter) ];
  if (isWindows) {
    const pathExtExe = optPathExt || [ '.EXE', '.CMD', '.BAT', '.COM' ].join(optDelimiter);
    const pathExt = pathExtExe.split(optDelimiter).flatMap((item => [ item, item.toLowerCase() ]));
    if (cmd.includes('.') && pathExt[0] !== '') {
      pathExt.unshift('');
    }
    return {
      pathEnv: pathEnv,
      pathExt: pathExt,
      pathExtExe: pathExtExe
    };
  }
  return {
    pathEnv: pathEnv,
    pathExt: [ '' ]
  };
};

const getPathPart = (raw, cmd) => {
  const pathPart = /^".*"$/.test(raw) ? raw.slice(1, -1) : raw;
  const prefix = !pathPart && rRel.test(cmd) ? cmd.slice(0, 2) : '';
  return prefix + join(pathPart, cmd);
};

const which = async (cmd, opt = {}) => {
  const {pathEnv: pathEnv, pathExt: pathExt, pathExtExe: pathExtExe} = getPathInfo(cmd, opt);
  const found = [];
  for (const envPart of pathEnv) {
    const p = getPathPart(envPart, cmd);
    for (const ext of pathExt) {
      const withExt = p + ext;
      const is = await isexe(withExt, {
        pathExt: pathExtExe,
        ignoreErrors: true
      });
      if (is) {
        if (!opt.all) {
          return withExt;
        }
        found.push(withExt);
      }
    }
  }
  if (opt.all && found.length) {
    return found;
  }
  if (opt.nothrow) {
    return null;
  }
  throw getNotFoundError(cmd);
};

const whichSync = (cmd, opt = {}) => {
  const {pathEnv: pathEnv, pathExt: pathExt, pathExtExe: pathExtExe} = getPathInfo(cmd, opt);
  const found = [];
  for (const pathEnvPart of pathEnv) {
    const p = getPathPart(pathEnvPart, cmd);
    for (const ext of pathExt) {
      const withExt = p + ext;
      const is = isexeSync(withExt, {
        pathExt: pathExtExe,
        ignoreErrors: true
      });
      if (is) {
        if (!opt.all) {
          return withExt;
        }
        found.push(withExt);
      }
    }
  }
  if (opt.all && found.length) {
    return found;
  }
  if (opt.nothrow) {
    return null;
  }
  throw getNotFoundError(cmd);
};

var lib = which;

which.sync = whichSync;

const which$1 = getDefaultExportFromCjs(lib);

const typeMappings = {
  directory: 'isDirectory',
  file: 'isFile'
};

function checkType(type) {
  if (Object.hasOwnProperty.call(typeMappings, type)) {
    return;
  }
  throw new Error(`Invalid type specified: ${type}`);
}

const matchType = (type, stat) => stat[typeMappings[type]]();

const toPath$1 = urlOrPath => urlOrPath instanceof URL ? fileURLToPath(urlOrPath) : urlOrPath;

function locatePathSync(paths, {cwd: cwd = process$2.cwd(), type: type = 'file', allowSymlinks: allowSymlinks = true} = {}) {
  checkType(type);
  cwd = toPath$1(cwd);
  const statFunction = allowSymlinks ? fs$l.statSync : fs$l.lstatSync;
  for (const path_ of paths) {
    try {
      const stat = statFunction(path__default.resolve(cwd, path_), {
        throwIfNoEntry: false
      });
      if (!stat) {
        continue;
      }
      if (matchType(type, stat)) {
        return path_;
      }
    } catch {}
  }
}

const toPath = urlOrPath => urlOrPath instanceof URL ? fileURLToPath(urlOrPath) : urlOrPath;

const findUpStop = Symbol('findUpStop');

function findUpMultipleSync(name, options = {}) {
  let directory = path__default.resolve(toPath(options.cwd) || '');
  const {root: root} = path__default.parse(directory);
  const stopAt = options.stopAt || root;
  const limit = options.limit || Number.POSITIVE_INFINITY;
  const paths = [ name ].flat();
  const runMatcher = locateOptions => {
    if (typeof name !== 'function') {
      return locatePathSync(paths, locateOptions);
    }
    const foundPath = name(locateOptions.cwd);
    if (typeof foundPath === 'string') {
      return locatePathSync([ foundPath ], locateOptions);
    }
    return foundPath;
  };
  const matches = [];
  while (true) {
    const foundPath = runMatcher({
      ...options,
      cwd: directory
    });
    if (foundPath === findUpStop) {
      break;
    }
    if (foundPath) {
      matches.push(path__default.resolve(directory, foundPath));
    }
    if (directory === stopAt || matches.length >= limit) {
      break;
    }
    directory = path__default.dirname(directory);
  }
  return matches;
}

function findUpSync(name, options = {}) {
  const matches = findUpMultipleSync(name, {
    ...options,
    limit: 1
  });
  return matches[0];
}

function pkgUpSync({cwd: cwd} = {}) {
  return findUpSync('package.json', {
    cwd: cwd
  });
}

function findPathToModule(dir, moduleNames) {
  const stat = statSync(dir);
  if (stat.isDirectory()) {
    const candidates = moduleNames.map((moduleName => resolve$1(dir, moduleName)));
    const modulePath = candidates.find(existsSync);
    if (modulePath) {
      return modulePath;
    }
  }
  const parent = resolve$1(dir, '..');
  if (parent !== dir) {
    return findPathToModule(parent, moduleNames);
  }
}

class TypeScriptVersion {
  constructor(source, path, logger) {
    this.source = source;
    this.path = path;
    this.logger = logger;
    this._api = null;
  }
  get tsServerPath() {
    return this.path;
  }
  get isValid() {
    return this.version !== null;
  }
  get version() {
    if (this._api) {
      return this._api;
    }
    this._api = this.getTypeScriptVersion(this.tsServerPath);
    return this._api;
  }
  get versionString() {
    const version = this.version;
    return version ? version.displayName : null;
  }
  getTypeScriptVersion(serverPath) {
    this.logger.log(`Resolving TypeScript version from path "${serverPath}"...`);
    if (!fs$l.existsSync(serverPath)) {
      this.logger.log('Server path does not exist on disk');
      return null;
    }
    const p = serverPath.split(path__default.sep);
    if (p.length <= 2) {
      this.logger.log('Server path is invalid (has less than two path components).');
      return null;
    }
    const p2 = p.slice(0, -2);
    const modulePath = p2.join(path__default.sep);
    let fileName = path__default.join(modulePath, 'package.json');
    if (!fs$l.existsSync(fileName)) {
      if (path__default.basename(modulePath) === 'built') {
        fileName = path__default.join(modulePath, '..', 'package.json');
      }
    }
    if (!fs$l.existsSync(fileName)) {
      this.logger.log(`Failed to find package.json at path "${fileName}"`);
      return null;
    }
    this.logger.log(`Reading version from package.json at "${fileName}"`);
    const contents = fs$l.readFileSync(fileName).toString();
    let desc = null;
    try {
      desc = JSON.parse(contents);
    } catch (err) {
      this.logger.log('Failed parsing contents of package.json.');
      return null;
    }
    if (!desc?.version) {
      this.logger.log('Failed reading version number from package.json.');
      return null;
    }
    this.logger.log(`Resolved TypeScript version to "${desc.version}"`);
    return API.fromVersionString(desc.version);
  }
}

const MODULE_FOLDERS = [ 'node_modules/typescript/lib', '.vscode/pnpify/typescript/lib', '.yarn/sdks/typescript/lib' ];

class TypeScriptVersionProvider {
  constructor(userTsserverPath, logger) {
    this.userTsserverPath = userTsserverPath;
    this.logger = logger;
  }
  getUserSettingVersion() {
    if (!this.userTsserverPath) {
      return null;
    }
    this.logger.log(`Resolving user-provided tsserver path "${this.userTsserverPath}"...`);
    let resolvedPath = this.userTsserverPath;
    if (!path__default.isAbsolute(resolvedPath)) {
      const binaryPath = which$1.sync(resolvedPath, {
        nothrow: true
      });
      if (binaryPath) {
        resolvedPath = binaryPath;
      }
      this.logger.log(`Non-absolute tsserver path resolved to "${binaryPath ? resolvedPath : '<failed>'}"`);
    }
    let stat = fs$l.lstatSync(resolvedPath, {
      throwIfNoEntry: false
    });
    if (stat?.isSymbolicLink()) {
      resolvedPath = fs$l.realpathSync(resolvedPath);
      this.logger.log(`Symbolic link tsserver path resolved to "${resolvedPath}"`);
    }
    stat = fs$l.lstatSync(resolvedPath, {
      throwIfNoEntry: false
    });
    if (stat?.isFile()) {
      if (path__default.basename(resolvedPath) === 'tsserver.js') {
        this.logger.log(`Resolved tsserver location: ${resolvedPath}`);
        return new TypeScriptVersion('user-setting', resolvedPath, this.logger);
      }
      resolvedPath = path__default.dirname(resolvedPath);
      this.logger.log(`Resolved directory path from a file path: ${resolvedPath}`);
    }
    try {
      const packageJsonPath = pkgUpSync({
        cwd: resolvedPath
      });
      this.logger.log(`Resolved package.json location: "${packageJsonPath}"`);
      if (packageJsonPath) {
        resolvedPath = path__default.join(path__default.dirname(packageJsonPath), 'lib', 'tsserver.js');
        this.logger.log(`Resolved tsserver location: "${resolvedPath}"`);
      }
    } catch {}
    return new TypeScriptVersion('user-setting', resolvedPath, this.logger);
  }
  getWorkspaceVersion(workspaceFolders) {
    for (const p of workspaceFolders) {
      const libFolder = findPathToModule(p, MODULE_FOLDERS);
      if (libFolder) {
        const tsServerPath = path__default.join(libFolder, 'tsserver.js');
        const version = new TypeScriptVersion('workspace', tsServerPath, this.logger);
        if (version.isValid) {
          return version;
        }
      }
    }
    return null;
  }
  bundledVersion() {
    const require = createRequire(import.meta.url);
    try {
      const file = require.resolve('typescript');
      const tsServerPath = path__default.join(path__default.dirname(file), 'tsserver.js');
      const bundledVersion = new TypeScriptVersion('bundled', tsServerPath, this.logger);
      return bundledVersion;
    } catch (e) {
      return null;
    }
  }
}

class LspServer {
  constructor(options) {
    this.options = options;
    this.initializeParams = null;
    this.completionDataCache = new CompletionDataCache;
    this.typeScriptAutoFixProvider = null;
    this.features = {};
    this.cachedNavTreeResponse = new CachedResponse;
    this.implementationsCodeLensProvider = null;
    this.referencesCodeLensProvider = null;
    this.logger = new PrefixingLogger(options.logger, '[lspserver]');
    this.tsClient = new TsClient(onCaseInsensitiveFileSystem(), this.logger, options.lspClient);
    this.fileConfigurationManager = new FileConfigurationManager(this.tsClient, onCaseInsensitiveFileSystem());
    this.diagnosticQueue = new DiagnosticEventQueue((diagnostics => this.options.lspClient.publishDiagnostics(diagnostics)), this.tsClient, this.features, this.logger);
  }
  closeAllForTesting() {
    for (const document of this.tsClient.documentsForTesting.values()) {
      this.closeDocument(document.uri.toString());
    }
  }
  async waitForDiagnosticsForFile(uri) {
    const document = this.tsClient.toOpenDocument(uri);
    if (!document) {
      throw new Error(`Document not open: ${uri}`);
    }
    await this.diagnosticQueue.waitForDiagnosticsForTesting(document.filepath);
  }
  shutdown() {
    this.tsClient.shutdown();
  }
  async initialize(params) {
    this.initializeParams = params;
    const clientCapabilities = this.initializeParams.capabilities;
    this.workspaceRoot = this.initializeParams.rootUri ? URI.parse(this.initializeParams.rootUri).fsPath : this.initializeParams.rootPath || undefined;
    const userInitializationOptions = this.initializeParams.initializationOptions || {};
    const {disableAutomaticTypingAcquisition: disableAutomaticTypingAcquisition, hostInfo: hostInfo, maxTsServerMemory: maxTsServerMemory, npmLocation: npmLocation, locale: locale, plugins: plugins, tsserver: tsserver} = userInitializationOptions;
    const typescriptVersion = this.findTypescriptVersion(tsserver?.path, tsserver?.fallbackPath);
    if (typescriptVersion) {
      this.options.lspClient.logMessage({
        type: main$3.MessageType.Info,
        message: `Using Typescript version (${typescriptVersion.source}) ${typescriptVersion.versionString} from path "${typescriptVersion.tsServerPath}"`
      });
    } else {
      throw Error('Could not find a valid TypeScript installation. Please ensure that the "typescript" dependency is installed in the workspace or that a valid `tsserver.path` is specified. Exiting.');
    }
    this.fileConfigurationManager.mergeTsPreferences(userInitializationOptions.preferences || {});
    this.features.completionDisableFilterText = userInitializationOptions.completionDisableFilterText ?? false;
    const {textDocument: textDocument} = clientCapabilities;
    if (textDocument) {
      const {codeAction: codeAction, completion: completion, definition: definition, publishDiagnostics: publishDiagnostics} = textDocument;
      if (codeAction) {
        this.features.codeActionDisabledSupport = codeAction.disabledSupport;
      }
      if (completion) {
        const {completionItem: completionItem} = completion;
        if (completionItem) {
          const {commitCharactersSupport: commitCharactersSupport, insertReplaceSupport: insertReplaceSupport, labelDetailsSupport: labelDetailsSupport, snippetSupport: snippetSupport} = completionItem;
          this.features.completionCommitCharactersSupport = commitCharactersSupport;
          this.features.completionInsertReplaceSupport = insertReplaceSupport;
          this.features.completionSnippets = snippetSupport;
          this.features.completionLabelDetails = this.fileConfigurationManager.tsPreferences.useLabelDetailsInCompletionEntries && labelDetailsSupport && typescriptVersion.version?.gte(API.v470);
        }
      }
      if (definition) {
        this.features.definitionLinkSupport = definition.linkSupport;
      }
      this.features.diagnosticsSupport = Boolean(publishDiagnostics);
      this.features.diagnosticsTagSupport = Boolean(publishDiagnostics?.tagSupport);
    }
    this.fileConfigurationManager.mergeTsPreferences({
      useLabelDetailsInCompletionEntries: this.features.completionLabelDetails
    });
    const tsserverLogVerbosity = tsserver?.logVerbosity && TsServerLogLevel.fromString(tsserver.logVerbosity);
    const started = this.tsClient.start(this.workspaceRoot, {
      trace: Trace.fromString(tsserver?.trace || 'off'),
      typescriptVersion: typescriptVersion,
      logDirectoryProvider: new LogDirectoryProvider(this.getLogDirectoryPath(userInitializationOptions)),
      logVerbosity: tsserverLogVerbosity ?? TsServerLogLevel.Off,
      disableAutomaticTypingAcquisition: disableAutomaticTypingAcquisition,
      maxTsServerMemory: maxTsServerMemory,
      npmLocation: npmLocation,
      hostInfo: hostInfo,
      locale: locale,
      plugins: plugins || [],
      onEvent: this.onTsEvent.bind(this),
      onExit: (exitCode, signal) => {
        this.shutdown();
        if (exitCode) {
          throw new Error(`tsserver process has exited (exit code: ${exitCode}, signal: ${signal}). Stopping the server.`);
        }
      },
      useSyntaxServer: toSyntaxServerConfiguration(userInitializationOptions.tsserver?.useSyntaxServer)
    });
    if (!started) {
      throw new Error('tsserver process has failed to start.');
    }
    process.on('exit', (() => {
      this.shutdown();
    }));
    process.on('SIGINT', (() => {
      process.exit();
    }));
    this.typeScriptAutoFixProvider = new TypeScriptAutoFixProvider(this.tsClient);
    this.fileConfigurationManager.setGlobalConfiguration(this.workspaceRoot, hostInfo);
    this.registerHandlers();
    const prepareSupport = textDocument?.rename?.prepareSupport && this.tsClient.apiVersion.gte(API.v310);
    const initializeResult = {
      capabilities: {
        textDocumentSync: main$3.TextDocumentSyncKind.Incremental,
        completionProvider: {
          triggerCharacters: [ '.', '"', '\'', '/', '@', '<' ],
          resolveProvider: true
        },
        codeActionProvider: clientCapabilities.textDocument?.codeAction?.codeActionLiteralSupport ? {
          codeActionKinds: [ ...TypeScriptAutoFixProvider.kinds.map((kind => kind.value)), CodeActionKind.SourceOrganizeImportsTs.value, CodeActionKind.SourceRemoveUnusedImportsTs.value, CodeActionKind.SourceSortImportsTs.value, CodeActionKind.QuickFix.value, CodeActionKind.Refactor.value ]
        } : true,
        codeLensProvider: {
          resolveProvider: true
        },
        definitionProvider: true,
        documentFormattingProvider: true,
        documentRangeFormattingProvider: true,
        documentHighlightProvider: true,
        documentSymbolProvider: true,
        executeCommandProvider: {
          commands: [ Commands.APPLY_WORKSPACE_EDIT, Commands.APPLY_CODE_ACTION, Commands.APPLY_REFACTORING, Commands.CONFIGURE_PLUGIN, Commands.ORGANIZE_IMPORTS, Commands.APPLY_RENAME_FILE, Commands.SOURCE_DEFINITION ]
        },
        hoverProvider: true,
        inlayHintProvider: true,
        linkedEditingRangeProvider: false,
        renameProvider: prepareSupport ? {
          prepareProvider: true
        } : true,
        referencesProvider: true,
        selectionRangeProvider: true,
        signatureHelpProvider: {
          triggerCharacters: [ '(', ',', '<' ],
          retriggerCharacters: [ ')' ]
        },
        workspaceSymbolProvider: true,
        implementationProvider: true,
        typeDefinitionProvider: true,
        foldingRangeProvider: true,
        semanticTokensProvider: {
          documentSelector: null,
          legend: {
            tokenTypes: [ 'class', 'enum', 'interface', 'namespace', 'typeParameter', 'type', 'parameter', 'variable', 'enumMember', 'property', 'function', 'member' ],
            tokenModifiers: [ 'declaration', 'static', 'async', 'readonly', 'defaultLibrary', 'local' ]
          },
          full: true,
          range: true
        },
        workspace: {
          fileOperations: {
            willRename: {
              filters: [ {
                scheme: 'file',
                pattern: {
                  glob: '**/*.{ts,js,jsx,tsx,mjs,mts,cjs,cts}',
                  matches: 'file'
                }
              }, {
                scheme: 'file',
                pattern: {
                  glob: '**',
                  matches: 'folder'
                }
              } ]
            }
          }
        }
      }
    };
    if (textDocument?.callHierarchy && typescriptVersion.version?.gte(API.v380)) {
      initializeResult.capabilities.callHierarchyProvider = true;
    }
    if (textDocument?.linkedEditingRange && typescriptVersion.version?.gte(API.v510)) {
      initializeResult.capabilities.linkedEditingRangeProvider = true;
    }
    this.logger.log('onInitialize result', initializeResult);
    return initializeResult;
  }
  registerHandlers() {
    if (this.initializeParams?.capabilities.textDocument?.codeLens) {
      this.implementationsCodeLensProvider = new TypeScriptImplementationsCodeLensProvider(this.tsClient, this.cachedNavTreeResponse, this.fileConfigurationManager);
      this.referencesCodeLensProvider = new TypeScriptReferencesCodeLensProvider(this.tsClient, this.cachedNavTreeResponse, this.fileConfigurationManager);
    }
  }
  initialized(_) {
    const {apiVersion: apiVersion, typescriptVersionSource: typescriptVersionSource} = this.tsClient;
    this.options.lspClient.sendNotification(TypescriptVersionNotification, {
      version: apiVersion.displayName,
      source: typescriptVersionSource
    });
  }
  findTypescriptVersion(userTsserverPath, fallbackTsserverPath) {
    const typescriptVersionProvider = new TypeScriptVersionProvider(userTsserverPath, this.logger);
    const userSettingVersion = typescriptVersionProvider.getUserSettingVersion();
    if (userSettingVersion) {
      if (userSettingVersion.isValid) {
        return userSettingVersion;
      }
      this.logger.logIgnoringVerbosity(LogLevel.Warning, `Typescript specified through user setting ignored due to invalid path "${userSettingVersion.path}"`);
    }
    if (this.workspaceRoot) {
      const workspaceVersion = typescriptVersionProvider.getWorkspaceVersion([ this.workspaceRoot ]);
      if (workspaceVersion) {
        return workspaceVersion;
      }
    }
    const fallbackVersionProvider = new TypeScriptVersionProvider(fallbackTsserverPath, this.logger);
    const fallbackSettingVersion = fallbackVersionProvider.getUserSettingVersion();
    if (fallbackSettingVersion) {
      if (fallbackSettingVersion.isValid) {
        return fallbackSettingVersion;
      }
      this.logger.logIgnoringVerbosity(LogLevel.Warning, `Typescript specified through fallback setting ignored due to invalid path "${fallbackSettingVersion.path}"`);
    }
    const bundledVersion = typescriptVersionProvider.bundledVersion();
    if (bundledVersion?.isValid) {
      return bundledVersion;
    }
    return null;
  }
  getLogDirectoryPath(initializationOptions) {
    if (initializationOptions.tsserver?.logDirectory) {
      return initializationOptions.tsserver.logDirectory;
    }
    if (this.workspaceRoot) {
      return path$e.join(this.workspaceRoot, '.log');
    }
    return undefined;
  }
  didChangeConfiguration(params) {
    this.fileConfigurationManager.setWorkspaceConfiguration(params.settings || {});
    const ignoredDiagnosticCodes = this.fileConfigurationManager.workspaceConfiguration.diagnostics?.ignoredCodes || [];
    this.tsClient.interruptGetErr((() => this.diagnosticQueue.updateIgnoredDiagnosticCodes(ignoredDiagnosticCodes)));
  }
  didOpenTextDocument(params) {
    if (this.tsClient.toOpenDocument(params.textDocument.uri, {
      suppressAlertOnFailure: true
    })) {
      throw new Error(`Can't open already open document: ${params.textDocument.uri}`);
    }
    if (!this.tsClient.openTextDocument(params.textDocument)) {
      throw new Error(`Cannot open document '${params.textDocument.uri}' (languageId: ${params.textDocument.languageId}).`);
    }
  }
  didCloseTextDocument(params) {
    this.closeDocument(params.textDocument.uri);
  }
  closeDocument(uri) {
    const document = this.tsClient.toOpenDocument(uri);
    if (!document) {
      throw new Error(`Trying to close not opened document: ${uri}`);
    }
    this.cachedNavTreeResponse.onDocumentClose(document);
    this.tsClient.onDidCloseTextDocument(uri);
    this.diagnosticQueue.onDidCloseFile(document.filepath);
    this.fileConfigurationManager.onDidCloseTextDocument(document.uri);
  }
  didChangeTextDocument(params) {
    this.tsClient.onDidChangeTextDocument(params);
  }
  didSaveTextDocument(_params) {}
  async definition(params, token) {
    return this.getDefinition({
      type: this.features.definitionLinkSupport ? CommandTypes.DefinitionAndBoundSpan : CommandTypes.Definition,
      params: params
    }, token);
  }
  async implementation(params, token) {
    return this.getSymbolLocations({
      type: CommandTypes.Implementation,
      params: params
    }, token);
  }
  async typeDefinition(params, token) {
    return this.getSymbolLocations({
      type: CommandTypes.TypeDefinition,
      params: params
    }, token);
  }
  async getDefinition({type: type, params: params}, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      return;
    }
    if (type === CommandTypes.DefinitionAndBoundSpan) {
      const args = Position.toFileLocationRequestArgs(document.filepath, params.position);
      const response = await this.tsClient.execute(type, args, token);
      if (response.type !== 'response' || !response.body) {
        return undefined;
      }
      const span = response.body.textSpan ? Range.fromTextSpan(response.body.textSpan) : undefined;
      return response.body.definitions.map((location => {
        const target = toLocation(location, this.tsClient);
        const targetRange = location.contextStart && location.contextEnd ? Range.fromLocations(location.contextStart, location.contextEnd) : target.range;
        return {
          originSelectionRange: span,
          targetRange: targetRange,
          targetUri: target.uri,
          targetSelectionRange: target.range
        };
      }));
    }
    return this.getSymbolLocations({
      type: CommandTypes.Definition,
      params: params
    });
  }
  async getSymbolLocations({type: type, params: params}, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      return [];
    }
    const args = Position.toFileLocationRequestArgs(document.filepath, params.position);
    const response = await this.tsClient.execute(type, args, token);
    if (response.type !== 'response' || !response.body) {
      return undefined;
    }
    return response.body.map((fileSpan => toLocation(fileSpan, this.tsClient)));
  }
  async documentSymbol(params, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      return [];
    }
    const response = await this.cachedNavTreeResponse.execute(document, (() => this.tsClient.execute(CommandTypes.NavTree, {
      file: document.filepath
    }, token)));
    if (response.type !== 'response' || !response.body?.childItems) {
      return [];
    }
    if (this.supportHierarchicalDocumentSymbol) {
      const symbols = [];
      for (const item of response.body.childItems) {
        collectDocumentSymbols(item, symbols);
      }
      return symbols;
    }
    const symbols = [];
    for (const item of response.body.childItems) {
      collectSymbolInformation(params.textDocument.uri, item, symbols);
    }
    return symbols;
  }
  get supportHierarchicalDocumentSymbol() {
    const textDocument = this.initializeParams?.capabilities.textDocument;
    const documentSymbol = textDocument?.documentSymbol;
    return !!documentSymbol && !!documentSymbol.hierarchicalDocumentSymbolSupport;
  }
  async completion(params, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      return main$3.CompletionList.create([]);
    }
    const {filepath: filepath} = document;
    this.completionDataCache.reset();
    const completionOptions = this.fileConfigurationManager.workspaceConfiguration.completions || {};
    const result = await this.tsClient.interruptGetErr((async () => {
      await this.fileConfigurationManager.ensureConfigurationForDocument(document, token);
      const response = await this.tsClient.execute(CommandTypes.CompletionInfo, {
        file: filepath,
        line: params.position.line + 1,
        offset: params.position.character + 1,
        triggerCharacter: getCompletionTriggerCharacter(params.context?.triggerCharacter),
        triggerKind: params.context?.triggerKind
      }, token);
      if (response.type !== 'response') {
        return undefined;
      }
      return response.body;
    }));
    if (!result) {
      return main$3.CompletionList.create();
    }
    const {entries: entries, isIncomplete: isIncomplete, optionalReplacementSpan: optionalReplacementSpan, isMemberCompletion: isMemberCompletion} = result;
    const line = document.getLine(params.position.line);
    let dotAccessorContext;
    if (isMemberCompletion) {
      const dotMatch = line.slice(0, params.position.character).match(/\??\.\s*$/) || undefined;
      if (dotMatch) {
        const startPosition = main$3.Position.create(params.position.line, params.position.character - dotMatch[0].length);
        const range = main$3.Range.create(startPosition, params.position);
        const text = document.getText(range);
        dotAccessorContext = {
          range: range,
          text: text
        };
      }
    }
    const completionContext = {
      isMemberCompletion: isMemberCompletion,
      dotAccessorContext: dotAccessorContext,
      line: line,
      optionalReplacementRange: optionalReplacementSpan ? Range.fromTextSpan(optionalReplacementSpan) : undefined
    };
    const completions = asCompletionItems(entries, this.completionDataCache, filepath, params.position, document, this.tsClient, completionOptions, this.features, completionContext);
    return main$3.CompletionList.create(completions, isIncomplete);
  }
  async completionResolve(item, token) {
    item.data = item.data?.cacheId !== undefined ? this.completionDataCache.get(item.data.cacheId) : item.data;
    const uri = this.tsClient.toResourceUri(item.data.file);
    const document = item.data?.file ? this.tsClient.toOpenDocument(uri) : undefined;
    if (!document) {
      return item;
    }
    await this.fileConfigurationManager.ensureConfigurationForDocument(document, token);
    const response = await this.tsClient.interruptGetErr((() => this.tsClient.execute(CommandTypes.CompletionDetails, item.data, token)));
    if (response.type !== 'response' || !response.body?.length) {
      return item;
    }
    return asResolvedCompletionItem(item, response.body[0], document, this.tsClient, this.fileConfigurationManager.workspaceConfiguration.completions || {}, this.features);
  }
  async hover(params, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      return {
        contents: []
      };
    }
    const result = await this.tsClient.interruptGetErr((async () => {
      await this.fileConfigurationManager.ensureConfigurationForDocument(document, token);
      const response = await this.tsClient.execute(CommandTypes.Quickinfo, Position.toFileLocationRequestArgs(document.filepath, params.position), token);
      if (response.type === 'response' && response.body) {
        return response.body;
      }
    }));
    if (!result) {
      return null;
    }
    const contents = new MarkdownString;
    const {displayString: displayString, documentation: documentation, tags: tags} = result;
    if (displayString) {
      contents.appendCodeblock('typescript', displayString);
    }
    addMarkdownDocumentation(contents, documentation, tags, this.tsClient);
    return {
      contents: contents.toMarkupContent(),
      range: Range.fromTextSpan(result)
    };
  }
  async prepareRename(params, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      return null;
    }
    const response = await this.tsClient.execute(CommandTypes.Rename, Position.toFileLocationRequestArgs(document.filepath, params.position), token);
    if (response.type !== 'response' || !response.body?.info) {
      return null;
    }
    const renameInfo = response.body.info;
    if (!renameInfo.canRename) {
      throw new Error(renameInfo.localizedErrorMessage);
    }
    return Range.fromTextSpan(renameInfo.triggerSpan);
  }
  async rename(params, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      return null;
    }
    const result = await this.tsClient.interruptGetErr((async () => {
      await this.fileConfigurationManager.ensureConfigurationForDocument(document);
      const response = await this.tsClient.execute(CommandTypes.Rename, Position.toFileLocationRequestArgs(document.filepath, params.position), token);
      if (response.type !== 'response' || !response.body?.info.canRename || !response.body?.locs.length) {
        return null;
      }
      return response.body;
    }));
    if (!result) {
      return null;
    }
    const changes = {};
    result.locs.forEach((spanGroup => {
      const uri = this.tsClient.toResourceUri(spanGroup.file);
      const textEdits = changes[uri] || (changes[uri] = []);
      spanGroup.locs.forEach((textSpan => {
        textEdits.push({
          newText: `${textSpan.prefixText || ''}${params.newName}${textSpan.suffixText || ''}`,
          range: {
            start: Position.fromLocation(textSpan.start),
            end: Position.fromLocation(textSpan.end)
          }
        });
      }));
    }));
    return {
      changes: changes
    };
  }
  async references(params, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      return [];
    }
    const response = await this.tsClient.execute(CommandTypes.References, Position.toFileLocationRequestArgs(document.filepath, params.position), token);
    if (response.type !== 'response' || !response.body) {
      return [];
    }
    return response.body.refs.filter((fileSpan => params.context.includeDeclaration || !fileSpan.isDefinition)).map((fileSpan => toLocation(fileSpan, this.tsClient)));
  }
  async documentFormatting(params, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      throw new Error(`The document should be opened for formatting', file: ${params.textDocument.uri}`);
    }
    const formatOptions = params.options;
    await this.fileConfigurationManager.ensureConfigurationOptions(document, formatOptions);
    const response = await this.tsClient.execute(CommandTypes.Format, {
      ...Range.toFormattingRequestArgs(document.filepath, document.getFullRange()),
      options: formatOptions
    }, token);
    if (response.type !== 'response' || !response.body) {
      return [];
    }
    return response.body.map((e => toTextEdit(e)));
  }
  async documentRangeFormatting(params, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      return [];
    }
    const formatOptions = params.options;
    await this.fileConfigurationManager.ensureConfigurationOptions(document, formatOptions);
    const response = await this.tsClient.execute(CommandTypes.Format, {
      ...Range.toFormattingRequestArgs(document.filepath, params.range),
      options: formatOptions
    }, token);
    if (response.type !== 'response' || !response.body) {
      return [];
    }
    return response.body.map((e => toTextEdit(e)));
  }
  async selectionRanges(params, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      return null;
    }
    const response = await this.tsClient.execute(CommandTypes.SelectionRange, {
      file: document.filepath,
      locations: params.positions.map(Position.toLocation)
    }, token);
    if (response.type !== 'response' || !response.body) {
      return null;
    }
    return response.body.map(toSelectionRange);
  }
  async signatureHelp(params, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      return undefined;
    }
    const {position: position, context: context} = params;
    const args = {
      file: document.filepath,
      line: position.line + 1,
      offset: position.character + 1,
      triggerReason: context ? toTsTriggerReason(context) : undefined
    };
    const response = await this.tsClient.interruptGetErr((() => this.tsClient.execute(CommandTypes.SignatureHelp, args, token)));
    if (response.type !== 'response' || !response.body) {
      return undefined;
    }
    return asSignatureHelp(response.body, params.context, this.tsClient);
  }
  async codeAction(params, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      return [];
    }
    await this.tsClient.interruptGetErr((() => this.fileConfigurationManager.ensureConfigurationForDocument(document)));
    const fileRangeArgs = Range.toFileRangeRequestArgs(document.filepath, params.range);
    const actions = [];
    const kinds = params.context.only?.map((kind => new CodeActionKind(kind)));
    if (!kinds || kinds.some((kind => kind.contains(CodeActionKind.QuickFix)))) {
      actions.push(...provideQuickFix(await this.getCodeFixes(fileRangeArgs, params.context, token), this.tsClient));
    }
    if (!kinds || kinds.some((kind => kind.contains(CodeActionKind.Refactor)))) {
      actions.push(...provideRefactors(await this.getRefactors(fileRangeArgs, params.context, token), fileRangeArgs, this.features));
    }
    for (const kind of kinds || []) {
      for (const command of organizeImportsCommands) {
        if (!kind.contains(command.kind) || command.minVersion && this.tsClient.apiVersion.lt(command.minVersion)) {
          continue;
        }
        let skipDestructiveCodeActions = command.mode === OrganizeImportsMode.SortAndCombine;
        let mode = command.mode;
        const isOrganizeImports = command.kind.equals(CodeActionKind.SourceOrganizeImportsTs);
        if (isOrganizeImports) {
          const documentHasErrors = params.context.diagnostics.some((d => (d.severity ?? 0) <= 2));
          skipDestructiveCodeActions = documentHasErrors;
          mode = OrganizeImportsMode.SortAndCombine;
        }
        const response = await this.tsClient.interruptGetErr((() => this.tsClient.execute(CommandTypes.OrganizeImports, {
          scope: {
            type: 'file',
            args: fileRangeArgs
          },
          skipDestructiveCodeActions: skipDestructiveCodeActions,
          mode: mode
        }, token)));
        if (response.type === 'response' && response.body) {
          actions.push(...provideOrganizeImports(command, response, this.tsClient));
        }
      }
    }
    if (kinds && !this.tsClient.hasPendingDiagnostics(document.uri)) {
      const diagnostics = this.diagnosticQueue.getDiagnosticsForFile(document.filepath) || [];
      if (diagnostics.length) {
        actions.push(...await this.typeScriptAutoFixProvider.provideCodeActions(kinds, document.filepath, diagnostics));
      }
    }
    return actions;
  }
  async getCodeFixes(fileRangeArgs, context, token) {
    const errorCodes = context.diagnostics.map((diagnostic => Number(diagnostic.code)));
    const args = {
      ...fileRangeArgs,
      errorCodes: errorCodes
    };
    const response = await this.tsClient.execute(CommandTypes.GetCodeFixes, args, token);
    return response.type === 'response' ? response : undefined;
  }
  async getRefactors(fileRangeArgs, context, token) {
    const args = {
      ...fileRangeArgs,
      triggerReason: context.triggerKind === main$3.CodeActionTriggerKind.Invoked ? 'invoked' : undefined,
      kind: context.only?.length === 1 ? context.only[0] : undefined
    };
    const response = await this.tsClient.execute(CommandTypes.GetApplicableRefactors, args, token);
    return response.type === 'response' ? response : undefined;
  }
  async executeCommand(params, token, workDoneProgress) {
    if (params.command === Commands.APPLY_WORKSPACE_EDIT && params.arguments) {
      const edit = params.arguments[0];
      await this.options.lspClient.applyWorkspaceEdit({
        edit: edit
      });
    } else if (params.command === Commands.APPLY_CODE_ACTION && params.arguments) {
      const codeAction = params.arguments[0];
      if (!await this.applyFileCodeEdits(codeAction.changes)) {
        return;
      }
      if (codeAction.commands?.length) {
        for (const command of codeAction.commands) {
          await this.tsClient.execute(CommandTypes.ApplyCodeActionCommand, {
            command: command
          }, token);
        }
      }
    } else if (params.command === Commands.APPLY_REFACTORING && params.arguments) {
      const args = params.arguments[0];
      const response = await this.tsClient.execute(CommandTypes.GetEditsForRefactor, args, token);
      if (response.type !== 'response' || !response.body) {
        return;
      }
      const {body: body} = response;
      if (!body?.edits.length) {
        return;
      }
      for (const edit of body.edits) {
        await fs.ensureFile(edit.fileName);
      }
      if (!await this.applyFileCodeEdits(body.edits)) {
        return;
      }
      const renameLocation = body.renameLocation;
      if (renameLocation) {
        await this.options.lspClient.rename({
          textDocument: {
            uri: this.tsClient.toResourceUri(args.file)
          },
          position: Position.fromLocation(renameLocation)
        });
      }
    } else if (params.command === Commands.CONFIGURE_PLUGIN && params.arguments) {
      const [pluginName, configuration] = params.arguments;
      this.tsClient.configurePlugin(pluginName, configuration);
    } else if (params.command === Commands.ORGANIZE_IMPORTS && params.arguments) {
      const file = params.arguments[0];
      const uri = this.tsClient.toResourceUri(file);
      const document = this.tsClient.toOpenDocument(uri);
      if (!document) {
        return;
      }
      const additionalArguments = params.arguments[1] || {};
      const body = await this.tsClient.interruptGetErr((async () => {
        await this.fileConfigurationManager.ensureConfigurationForDocument(document);
        const response = await this.tsClient.execute(CommandTypes.OrganizeImports, {
          scope: {
            type: 'file',
            args: {
              file: file
            }
          },
          skipDestructiveCodeActions: additionalArguments.skipDestructiveCodeActions,
          mode: additionalArguments.skipDestructiveCodeActions ? OrganizeImportsMode.SortAndCombine : OrganizeImportsMode.All
        }, token);
        if (response.type !== 'response') {
          return;
        }
        return response.body;
      }));
      if (!body) {
        return;
      }
      await this.applyFileCodeEdits(body);
    } else if (params.command === Commands.APPLY_RENAME_FILE && params.arguments) {
      const {sourceUri: sourceUri, targetUri: targetUri} = params.arguments[0];
      this.applyRenameFile(sourceUri, targetUri, token);
    } else if (params.command === Commands.APPLY_COMPLETION_CODE_ACTION && params.arguments) {
      const [_, codeActions] = params.arguments;
      for (const codeAction of codeActions) {
        await this.applyFileCodeEdits(codeAction.changes);
        if (codeAction.commands?.length) {
          for (const command of codeAction.commands) {
            await this.tsClient.execute(CommandTypes.ApplyCodeActionCommand, {
              command: command
            }, token);
          }
        }
        break;
      }
    } else if (params.command === Commands.SOURCE_DEFINITION) {
      const [uri, position] = params.arguments || [];
      const reporter = await this.options.lspClient.createProgressReporter(token, workDoneProgress);
      return SourceDefinitionCommand.execute(uri, position, this.tsClient, this.options.lspClient, reporter, token);
    } else {
      this.logger.error(`Unknown command ${params.command}.`);
    }
  }
  async applyFileCodeEdits(edits) {
    if (!edits.length) {
      return false;
    }
    const changes = {};
    for (const edit of edits) {
      changes[this.tsClient.toResourceUri(edit.fileName)] = edit.textChanges.map(toTextEdit);
    }
    const {applied: applied} = await this.options.lspClient.applyWorkspaceEdit({
      edit: {
        changes: changes
      }
    });
    return applied;
  }
  async willRenameFiles(params, token) {
    const changes = {};
    for (const rename of params.files) {
      const codeEdits = await this.getEditsForFileRename(rename.oldUri, rename.newUri, token);
      for (const codeEdit of codeEdits) {
        const uri = this.tsClient.toResourceUri(codeEdit.fileName);
        const textEdits = changes[uri] || (changes[uri] = []);
        textEdits.push(...codeEdit.textChanges.map(toTextEdit));
      }
    }
    return {
      changes: changes
    };
  }
  async applyRenameFile(sourceUri, targetUri, token) {
    const edits = await this.getEditsForFileRename(sourceUri, targetUri, token);
    this.applyFileCodeEdits(edits);
  }
  async getEditsForFileRename(sourceUri, targetUri, token) {
    const newFilePath = this.tsClient.toTsFilePath(targetUri);
    const oldFilePath = this.tsClient.toTsFilePath(sourceUri);
    if (!newFilePath || !oldFilePath) {
      return [];
    }
    const response = await this.tsClient.interruptGetErr((() => this.tsClient.execute(CommandTypes.GetEditsForFileRename, {
      oldFilePath: oldFilePath,
      newFilePath: newFilePath
    }, token)));
    if (response.type !== 'response' || !response.body) {
      return [];
    }
    return response.body;
  }
  async codeLens(params, token) {
    if (!this.implementationsCodeLensProvider || !this.referencesCodeLensProvider) {
      return [];
    }
    const doc = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!doc) {
      return [];
    }
    return [ ...await this.implementationsCodeLensProvider.provideCodeLenses(doc, token), ...await this.referencesCodeLensProvider.provideCodeLenses(doc, token) ];
  }
  async codeLensResolve(codeLens, token) {
    if (!this.implementationsCodeLensProvider || !this.referencesCodeLensProvider) {
      return codeLens;
    }
    if (codeLens.data?.type === CodeLensType.Implementation) {
      return await this.implementationsCodeLensProvider.resolveCodeLens(codeLens, token);
    }
    if (codeLens.data?.type === CodeLensType.Reference) {
      return await this.referencesCodeLensProvider.resolveCodeLens(codeLens, token);
    }
    throw new Error('Unexpected CodeLens!');
  }
  async documentHighlight(params, token) {
    const doc = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!doc) {
      throw new Error(`The document should be opened first: ${params.textDocument.uri}`);
    }
    const response = await this.tsClient.execute(CommandTypes.DocumentHighlights, {
      file: doc.filepath,
      line: params.position.line + 1,
      offset: params.position.character + 1,
      filesToSearch: [ doc.filepath ]
    }, token);
    if (response.type !== 'response' || !response.body) {
      return [];
    }
    return response.body.flatMap((item => toDocumentHighlight(item)));
  }
  async workspaceSymbol(params, token) {
    const response = await this.tsClient.execute(CommandTypes.Navto, {
      file: this.tsClient.lastFileOrDummy(),
      searchValue: params.query
    }, token);
    if (response.type !== 'response' || !response.body) {
      return [];
    }
    return response.body.map((item => ({
      location: {
        uri: this.tsClient.toResourceUri(item.file),
        range: {
          start: Position.fromLocation(item.start),
          end: Position.fromLocation(item.end)
        }
      },
      kind: toSymbolKind(item.kind),
      name: item.name
    })));
  }
  async foldingRanges(params, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      throw new Error(`The document should be opened for foldingRanges', file: ${params.textDocument.uri}`);
    }
    const response = await this.tsClient.execute(CommandTypes.GetOutliningSpans, {
      file: document.filepath
    }, token);
    if (response.type !== 'response' || !response.body) {
      return undefined;
    }
    const foldingRanges = [];
    for (const span of response.body) {
      const foldingRange = this.asFoldingRange(span, document);
      if (foldingRange) {
        foldingRanges.push(foldingRange);
      }
    }
    return foldingRanges;
  }
  asFoldingRange(span, document) {
    const range = Range.fromTextSpan(span.textSpan);
    const kind = this.asFoldingRangeKind(span);
    if (span.kind === 'comment') {
      const line = document.getLine(range.start.line);
      if (line.match(/\/\/\s*#endregion/gi)) {
        return undefined;
      }
    }
    const startLine = range.start.line;
    const endLine = range.end.character > 0 && document.getText(main$3.Range.create(main$3.Position.create(range.end.line, range.end.character - 1), range.end)) === '}' ? Math.max(range.end.line - 1, range.start.line) : range.end.line;
    return {
      startLine: startLine,
      endLine: endLine,
      kind: kind
    };
  }
  asFoldingRangeKind(span) {
    switch (span.kind) {
     case 'comment':
      return main$3.FoldingRangeKind.Comment;

     case 'region':
      return main$3.FoldingRangeKind.Region;

     case 'imports':
      return main$3.FoldingRangeKind.Imports;

     case 'code':
     default:
      return undefined;
    }
  }
  async onTsEvent(event) {
    if (event.event === 'semanticDiag' || event.event === 'syntaxDiag' || event.event === 'suggestionDiag') {
      const diagnosticEvent = event;
      if (diagnosticEvent.body?.diagnostics) {
        const {file: file, diagnostics: diagnostics} = diagnosticEvent.body;
        this.diagnosticQueue.updateDiagnostics(getDignosticsKind(event), file, diagnostics);
      }
    }
  }
  async prepareCallHierarchy(params, token) {
    const document = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!document) {
      return null;
    }
    const args = Position.toFileLocationRequestArgs(document.filepath, params.position);
    const response = await this.tsClient.execute(CommandTypes.PrepareCallHierarchy, args, token);
    if (response.type !== 'response' || !response.body) {
      return null;
    }
    const items = Array.isArray(response.body) ? response.body : [ response.body ];
    return items.map((item => fromProtocolCallHierarchyItem(item, this.tsClient, this.workspaceRoot)));
  }
  async callHierarchyIncomingCalls(params, token) {
    const file = this.tsClient.toTsFilePath(params.item.uri);
    if (!file) {
      return null;
    }
    const args = Position.toFileLocationRequestArgs(file, params.item.selectionRange.start);
    const response = await this.tsClient.execute(CommandTypes.ProvideCallHierarchyIncomingCalls, args, token);
    if (response.type !== 'response' || !response.body) {
      return null;
    }
    return response.body.map((item => fromProtocolCallHierarchyIncomingCall(item, this.tsClient, this.workspaceRoot)));
  }
  async callHierarchyOutgoingCalls(params, token) {
    const file = this.tsClient.toTsFilePath(params.item.uri);
    if (!file) {
      return null;
    }
    const args = Position.toFileLocationRequestArgs(file, params.item.selectionRange.start);
    const response = await this.tsClient.execute(CommandTypes.ProvideCallHierarchyOutgoingCalls, args, token);
    if (response.type !== 'response' || !response.body) {
      return null;
    }
    return response.body.map((item => fromProtocolCallHierarchyOutgoingCall(item, this.tsClient, this.workspaceRoot)));
  }
  async inlayHints(params, token) {
    return await TypeScriptInlayHintsProvider.provideInlayHints(params.textDocument, params.range, this.tsClient, this.options.lspClient, this.fileConfigurationManager, token);
  }
  async linkedEditingRange(params, token) {
    const doc = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!doc) {
      return null;
    }
    const args = Position.toFileLocationRequestArgs(doc.filepath, params.position);
    const response = await this.tsClient.execute(CommandTypes.LinkedEditingRange, args, token);
    if (response.type !== 'response' || !response.body) {
      return null;
    }
    return {
      ranges: response.body.ranges.map(Range.fromTextSpan),
      wordPattern: response.body.wordPattern
    };
  }
  async semanticTokensFull(params, token) {
    const doc = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!doc) {
      return {
        data: []
      };
    }
    const start = doc.offsetAt({
      line: 0,
      character: 0
    });
    const end = doc.offsetAt({
      line: doc.lineCount,
      character: 0
    });
    return this.getSemanticTokens(doc, doc.filepath, start, end, token);
  }
  async semanticTokensRange(params, token) {
    const doc = this.tsClient.toOpenDocument(params.textDocument.uri);
    if (!doc) {
      return {
        data: []
      };
    }
    const start = doc.offsetAt(params.range.start);
    const end = doc.offsetAt(params.range.end);
    return this.getSemanticTokens(doc, doc.filepath, start, end, token);
  }
  async getSemanticTokens(doc, file, startOffset, endOffset, token) {
    const response = await this.tsClient.execute(CommandTypes.EncodedSemanticClassificationsFull, {
      file: file,
      start: startOffset,
      length: endOffset - startOffset,
      format: '2020'
    }, token, {
      cancelOnResourceChange: doc.uri.toString()
    });
    if (response.type !== 'response' || !response.body?.spans) {
      return {
        data: []
      };
    }
    return {
      data: transformSpans(doc, response.body.spans)
    };
  }
}

const nullProgressReporter = attachWorkDone_1(undefined, undefined);

class LspClientImpl {
  constructor(connection) {
    this.connection = connection;
  }
  async createProgressReporter(_, workDoneProgress) {
    let reporter;
    if (workDoneProgress && workDoneProgress.constructor !== nullProgressReporter.constructor) {
      reporter = workDoneProgress;
    } else {
      reporter = workDoneProgress || await this.connection.window.createWorkDoneProgress();
    }
    return reporter;
  }
  async withProgress(options, task) {
    const {message: message, reporter: reporter} = options;
    reporter.begin(message);
    return task(reporter).then((result => {
      reporter.done();
      return result;
    }));
  }
  publishDiagnostics(params) {
    this.connection.sendDiagnostics(params);
  }
  showErrorMessage(message) {
    this.connection.sendNotification(main$3.ShowMessageNotification.type, {
      type: main$3.MessageType.Error,
      message: message
    });
  }
  logMessage(args) {
    this.connection.sendNotification(main$3.LogMessageNotification.type, args);
  }
  async applyWorkspaceEdit(params) {
    return this.connection.workspace.applyEdit(params);
  }
  async rename(args) {
    return this.connection.sendRequest(TypeScriptRenameRequest.type, args);
  }
  async sendNotification(type, params) {
    await this.connection.sendNotification(type, params);
  }
}

function createLspConnection(options) {
  const connection = lsp.createConnection(lsp.ProposedFeatures.all);
  const lspClient = new LspClientImpl(connection);
  const logger = new LspClientLogger(lspClient, options.showMessageLevel);
  const server = new LspServer({
    logger: logger,
    lspClient: lspClient
  });
  connection.onInitialize(server.initialize.bind(server));
  connection.onInitialized(server.initialized.bind(server));
  connection.onDidChangeConfiguration(server.didChangeConfiguration.bind(server));
  connection.onDidOpenTextDocument(server.didOpenTextDocument.bind(server));
  connection.onDidSaveTextDocument(server.didSaveTextDocument.bind(server));
  connection.onDidCloseTextDocument(server.didCloseTextDocument.bind(server));
  connection.onDidChangeTextDocument(server.didChangeTextDocument.bind(server));
  connection.onCodeAction(server.codeAction.bind(server));
  connection.onCodeLens(server.codeLens.bind(server));
  connection.onCodeLensResolve(server.codeLensResolve.bind(server));
  connection.onCompletion(server.completion.bind(server));
  connection.onCompletionResolve(server.completionResolve.bind(server));
  connection.onDefinition(server.definition.bind(server));
  connection.onImplementation(server.implementation.bind(server));
  connection.onTypeDefinition(server.typeDefinition.bind(server));
  connection.onDocumentFormatting(server.documentFormatting.bind(server));
  connection.onDocumentRangeFormatting(server.documentRangeFormatting.bind(server));
  connection.onDocumentHighlight(server.documentHighlight.bind(server));
  connection.onDocumentSymbol(server.documentSymbol.bind(server));
  connection.onExecuteCommand(server.executeCommand.bind(server));
  connection.onHover(server.hover.bind(server));
  connection.onReferences(server.references.bind(server));
  connection.onRenameRequest(server.rename.bind(server));
  connection.onPrepareRename(server.prepareRename.bind(server));
  connection.onSelectionRanges(server.selectionRanges.bind(server));
  connection.onSignatureHelp(server.signatureHelp.bind(server));
  connection.onWorkspaceSymbol(server.workspaceSymbol.bind(server));
  connection.onFoldingRanges(server.foldingRanges.bind(server));
  connection.languages.onLinkedEditingRange(server.linkedEditingRange.bind(server));
  connection.languages.callHierarchy.onPrepare(server.prepareCallHierarchy.bind(server));
  connection.languages.callHierarchy.onIncomingCalls(server.callHierarchyIncomingCalls.bind(server));
  connection.languages.callHierarchy.onOutgoingCalls(server.callHierarchyOutgoingCalls.bind(server));
  connection.languages.inlayHint.on(server.inlayHints.bind(server));
  connection.languages.semanticTokens.on(server.semanticTokensFull.bind(server));
  connection.languages.semanticTokens.onRange(server.semanticTokensRange.bind(server));
  connection.workspace.onWillRenameFiles(server.willRenameFiles.bind(server));
  return connection;
}

const DEFAULT_LOG_LEVEL = lsp$1.MessageType.Info;

const {version: version} = JSON.parse(readFileSync$1(new URL('../package.json', import.meta.url), {
  encoding: 'utf8'
}));

const program = new Command('typescript-language-server').version(version).requiredOption('--stdio', 'use stdio').option('--log-level <logLevel>', 'A number indicating the log level (4 = log, 3 = info, 2 = warn, 1 = error). Defaults to `2`.').parse(process.argv);

const options = program.opts();

let logLevel = DEFAULT_LOG_LEVEL;

if (options.logLevel) {
  logLevel = parseInt(options.logLevel, 10);
  if (logLevel && (logLevel < 1 || logLevel > 4)) {
    console.error(`Invalid '--log-level ${logLevel}'. Falling back to 'info' level.`);
    logLevel = DEFAULT_LOG_LEVEL;
  }
}

createLspConnection({
  showMessageLevel: logLevel
}).listen();
//# sourceMappingURL=cli.mjs.map
