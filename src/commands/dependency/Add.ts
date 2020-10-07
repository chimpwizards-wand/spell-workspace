import Debug from 'debug';
import { Command } from  '@chimpwizards/wand'
import { Config } from '@chimpwizards/wand'
import { CommandDefinition, CommandParameter, CommandArgument } from '@chimpwizards/wand/commons/command/'

import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';  
import { Clone } from '../workpace/Clone';

const chalk = require('chalk');
const debug = Debug("w:cli:dependency:add");

@CommandDefinition({ 
    description: 'Create add a new dependency to the workspace',
    alias: 'a',
    parent: 'dependency',  //TODO: Get the parent from the folder structure
    examples: [
        [`w dependency add git@github.com:acme/helloworld.git`, `Add a dependency into current workspace`],
        [`w dependency add --git git@github.com:acme/helloworld.git `, `Add a dependency into current workspace`],
    ]
})
export class Add extends Clone  { 


}

export function register ():any {
    debug(`Registering....`)
    let command = new Add();
    debug(`INIT: ${JSON.stringify(Object.getOwnPropertyNames(command))}`)

    return command.build()
}

