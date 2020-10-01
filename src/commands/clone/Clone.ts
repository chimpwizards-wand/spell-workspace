import Debug from 'debug';
import { Command } from  '@chimpwizards/wand'
import { Config } from '@chimpwizards/wand'
import { CommandDefinition, CommandParameter, CommandArgument } from '@chimpwizards/wand/commons/command/'

import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';  

const chalk = require('chalk');
const debug = Debug("w:cli:workspace");
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';


@CommandDefinition({ 
    description: 'Clone existing workspace/project',
    alias: 'c',
    parent: "workspace",
    examples: [
        [`workspace clone git@github.com:acme/helloworld.git`, `Clone an existing workspace`],
    ]
})
export class Clone extends Command  { 

    
    @CommandArgument({ description: 'Git repository URI', required: true})
    git: string = "";

    @CommandParameter({ description: 'Location'})
    location: string = process.cwd();    

    execute(yargs: any): void {
        debug(`URL ${this.git}`)
        
        debug(`Configure git cli`)
        const options: SimpleGitOptions = {
            baseDir: process.cwd(),
            binary: 'git',
            maxConcurrentProcesses: 6,
         };
        const git: SimpleGit = simpleGit(options);

        debug(`Clonign repo into ${this.location}`)
        git.clone(this.git, this.location)
            .then(() => console.log('finished'))
            .catch((err) => console.error('failed: ', err));

    }

}

export function register ():any {
    debug(`Registering....`)
    let command = new Clone();
    debug(`INIT: ${JSON.stringify(Object.getOwnPropertyNames(command))}`)

    return command.build()
}

