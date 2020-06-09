import Debug from 'debug';
import { Command } from  '@chimpwizards/wand'
import { Config } from '@chimpwizards/wand'
import { CommandDefinition, CommandParameter, CommandArgument } from '@chimpwizards/wand/commons/command/index'

import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';  

const chalk = require('chalk');
const debug = Debug("w:cli:workspace");

@CommandDefinition({ 
    description: 'Create new workspace/project',
    alias: 'w',
    examples: [
        [`new workspace`, `Create workspace in the current folder`],
        [`new workspace helloworld`, `Create "helloworld" workspace in a new folder "helloworld"`],
        [`new workspace --name helloworld`, `Create "helloworld" workspace in a new folder "helloworld"`],
    ]
})
export class Workspace extends Command  { 

    
    @CommandArgument({ description: 'Workspace Name', name: 'workspace-name'})
    @CommandParameter({ description: 'Workspace Name'})
    name: string = '';


    execute(yargs: any): void {
        debug(`Workspace ${this.name}`)
        debug(`THIS ${JSON.stringify(this)}`)
        debug(`YARGS ${JSON.stringify(yargs)}`)
        const config = new Config();
        const context = config.load()
        debug(`CONFIG ${JSON.stringify(context)}`)

        //If name is not defined then use current folder as name
        let workspace = this.name;
        let dir = '.'

        if (!workspace|| workspace.length==0) {
            workspace = path.basename(process.cwd());
        } else {
            dir = path.join('.', workspace);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
        }
        const fullPath = config.save( {dir: dir, context: {name: workspace}})
        console.log(`Creating new workspace [${chalk.green(workspace)}] @ [${fullPath}]`)

    }

}

export function register ():any {
    debug(`Registering....`)
    let command = new Workspace();
    debug(`INIT: ${JSON.stringify(Object.getOwnPropertyNames(command))}`)

    return command.build()
}

