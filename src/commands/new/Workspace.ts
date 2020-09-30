import Debug from 'debug';
import { Command } from  '@chimpwizards/wand'
import { Config } from '@chimpwizards/wand'
import { CommandDefinition, CommandParameter, CommandArgument } from '@chimpwizards/wand/commons/command/'

import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';  

const chalk = require('chalk');
const debug = Debug("w:cli:workspace");

@CommandDefinition({ 
    description: 'Create new workspace/project',
    alias: 'w',
    parent: 'new',  //TODO: Get the parent from the folder structure
    examples: [
        [`new workspace`, `Create workspace in the current folder`],
        [`new workspace helloworld`, `Create "helloworld" workspace in a new folder "helloworld"`],
        [`new workspace --name helloworld`, `Create "helloworld" workspace in a new folder "helloworld"`],
        [`new workspace --name helloworld --git git@github.com:acme/helloworld.git `, `Create "helloworld" workspace in a new folder "helloworld" with preconfigured git repo`],
    ]
})
export class Workspace extends Command  { 

    
    @CommandArgument({ description: 'Workspace Name', name: 'workspace-name'})
    @CommandParameter({ description: 'Workspace Name'})
    name: string = '';

    @CommandParameter({ description: 'Git repository URI', defaults: ''})
    git: string = "";


    execute(yargs: any): void {
        debug(`Workspace ${this.name}`)
        debug(`THIS ${JSON.stringify(this)}`)
        debug(`YARGS ${JSON.stringify(yargs)}`)
        const config = new Config();
        
        //debug(`CONFIG ${JSON.stringify(context)}`)

        //If name is not defined then use current folder as name
        let workspace = this.name;
        let dir = '.'

        if (!workspace|| workspace.length==0) {
            workspace = path.basename(process.cwd());
        } else {
            dir = path.join(process.cwd(), workspace);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
        }
        
        const fullPath = config.save( {dir: dir, context: {name: workspace}, forceNew: true})

        //If this new workspace is beein created inside other one
        if (config.inContext({dir: process.cwd()})) {
            debug(`UPDATE parent context`)
            const parentContext = config.load()

            //Add the new folder as part of the dependencies of the parent
            let location = dir.replace(parentContext.local.root+"/","")
            
            let exists =  _.find(parentContext.dependencies, {path:location})
            if (!exists) {
                let dependency: any = {
                    path: location,
                    tags: [
                        "workspace",
                        workspace
                    ]
                }
                if (this.git && this.git.length>0) {
                    dependency['git'] = this.git;
                }
                parentContext.dependencies.push(dependency)
                config.save( {context: parentContext} )
            }

            //Add the new folder into .gitignore
            let gitignore = path.join(process.cwd(),'.gitignore')
            fs.appendFile(gitignore, '\n'+location, function (err) {
                if (err) throw err;
                debug(`Added to .gitignore`)
            });
        }
        
        console.log(`Creating new workspace [${chalk.green(workspace)}] @ [${fullPath}]`)

    }

}

export function register ():any {
    debug(`Registering....`)
    let command = new Workspace();
    debug(`INIT: ${JSON.stringify(Object.getOwnPropertyNames(command))}`)

    return command.build()
}

