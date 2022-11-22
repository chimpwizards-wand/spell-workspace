import Debug from 'debug';
import { Command } from  '@chimpwizards/wand'
import { Config } from '@chimpwizards/wand'
import { CommandDefinition, CommandParameter, CommandArgument } from '@chimpwizards/wand/commons/command/'

import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';  
import { Clone } from '../workspace/Clone';

const chalk = require('chalk');
const debug = Debug("w:cli:component:import");

@CommandDefinition({ 
    description: 'Import an existing component to the workspace',
    alias: 'i',
    parent: 'component',  //TODO: Get the parent from the folder structure
    examples: [
        [`w component import git@github.com:acme/helloworld.git`, `Import a component into current workspace`],
        [`w component import --git git@github.com:acme/helloworld.git `, `Import a component into current workspace`],
    ]
})
export class Import extends Command  { 

    @CommandParameter({ description: 'Location of the component. if not provided components/<name> will be used', alias: 'l',})
    location: string= "";    

    @CommandParameter({ description: 'Git repository URI. If not provided will be calculated using the workspace organization', alias: 'g',})
    git: string = "";

    execute(yargs: any): void {
        debug(`URL ${this.git}`)

        let workspace = this.git.split("/").reverse()[0].replace(".git","");
        let clone = new Clone();
        clone.git = this.git;
        clone.location = this.location || 'components';
        clone.cloneRepo(this.git, (this.location.length==0)?process.cwd():this.location, workspace)
    }

}

export function register ():any {
    debug(`Registering....`)
    let command = new Import();
    debug(`INIT: ${JSON.stringify(Object.getOwnPropertyNames(command))}`)

    return command.build()
}

