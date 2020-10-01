import Debug from 'debug';
import { Command } from  '@chimpwizards/wand'
import { Config } from '@chimpwizards/wand'
import { CommandDefinition, CommandParameter, CommandArgument } from '@chimpwizards/wand/commons/command/'

import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';  

const chalk = require('chalk');
const debug = Debug("w:cli:dependency");

@CommandDefinition({ 
    description: 'Create add a new dependency to the workspace',
    alias: 'd',
    parent: 'add',  //TODO: Get the parent from the folder structure
    examples: [
        [`add dependency git@github.com:acme/helloworld.git`, `Add dependency into current workspace`],
        [`new dependency --git git@github.com:acme/helloworld.git `, `Add dependency into current workspace`],
    ]
})
export class Dependency extends Command  { 

    @CommandArgument({ description: 'Git repository URI', name: 'git-repository'})
    @CommandParameter({ description: 'Git repository URI'})
    git: string = "";


    execute(yargs: any): void {
        debug(`Git ${this.git}`)

    }

}

export function register ():any {
    debug(`Registering....`)
    let command = new Dependency();
    debug(`INIT: ${JSON.stringify(Object.getOwnPropertyNames(command))}`)

    return command.build()
}

