import Debug from 'debug';
import { Command } from  '@chimpwizards/wand'
import { Config } from '@chimpwizards/wand'
import { CommandDefinition, CommandParameter, CommandArgument } from '@chimpwizards/wand/commons/command/'

import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';  

const chalk = require('chalk');
const debug = Debug("w:cli:workspace:init");
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';

@CommandDefinition({ 
    description: 'Initialize wand workspace for current location',
    alias: 'i',
    parent: 'workspace',  
    examples: [
        [`w workspace init`, `Create workspace config in the current folder`],
    ]
})
export class Init extends Command  { 

    
    execute(yargs: any): void {
        debug(`THIS ${JSON.stringify(this)}`)
        debug(`YARGS ${JSON.stringify(yargs)}`)

        const config = new Config();
        let context: any = config.load({})
        let dir = process.cwd()

        if (context.local.root == dir) {
            console.log(chalk.red(`WAND configuration already exists here`))
            return;
        }

        //If name is not defined then use current folder as name
        let workspace = path.basename(process.cwd());


        const options: SimpleGitOptions = {
            baseDir: dir,
            binary: 'git',
            maxConcurrentProcesses: 6,
         };
        const GIT: SimpleGit = simpleGit(options);
        GIT.getRemotes().then( (remotes) => {
            debug(`Remotes: ${JSON.stringify(remotes)}`)
            context = {
                name: workspace
                //git
                //organization
            };

            const fullPath = config.save( {dir: dir, context: context, forceNew: true})

            console.log(`Workspace [${chalk.green(workspace)}] created @ [${fullPath}]`)
        });

    }

}

export function register ():any {
    debug(`Registering....`)
    let command = new Init();
    debug(`INIT: ${JSON.stringify(Object.getOwnPropertyNames(command))}`)

    return command.build()
}

