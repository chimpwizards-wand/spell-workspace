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
    description: 'Create new workspace/project',
    alias: 'w',
    parent: 'new',  //TODO: Get the parent from the folder structure. This update should go into main core component
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

    @CommandParameter({ description: 'Git repository URI'})
    git: string = "";

    @CommandParameter({ description: 'Git Origanization URI'})
    organization: string = "";


    execute(yargs: any): void {
        debug(`Workspace ${this.name}`)
        debug(`THIS ${JSON.stringify(this)}`)
        debug(`YARGS ${JSON.stringify(yargs)}`)

        const config = new Config();
        
        //If name is not defined then use current folder as name
        let workspace = this.name;
        let dir = process.cwd()

        if (!workspace|| workspace.length==0) {
            workspace = path.basename(process.cwd());
        } else {
            dir = path.join(process.cwd(), workspace);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
        }
        
        let context: any = {name: workspace};
        if (this.git && this.git.length>0) {
            context['git'] = this.git;
        }
        if (this.organization && this.organization.length>0) {
            context['organization'] = this.organization;

            if (!this.git || this.git.length == 0) {
                this.git = this.organization + "/" + workspace
            }
        }

        const fullPath = config.save( {dir: dir, context: context, forceNew: true})

        debug(`If this new workspace is beein created inside other one link them together`)
        if (config.inContext({dir: process.cwd()})) {
            debug(`UPDATE parent context`)
            const parentContext = config.load()

            debug(`Add the new folder as part of the dependencies of the parent`)
            debug(`Keep path relative tot he root of the workspce`)
            debug(`Current dir: ${dir}`)
            debug(`Context root: ${parentContext.local.root}`)
            let location = dir.replace(parentContext.local.root,"").slice(1) //Remove first stash/backstash
            debug(`Relative location: ${location}`)

            debug(`Check if workspace is already added into parent config`)
            let exists =  false;
            if (parentContext.dependencies) {
                exists = _.find(parentContext.dependencies, {path:location})
            } else {
                debug(`Creating dependencies bucket in config`)
                parentContext['dependencies'] = []
            }

            debug(`Add the workspace to the current context if doesn't exists`)
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

                    debug(`Configure git cli`)
                    const options: SimpleGitOptions = {
                        baseDir: dir,
                        binary: 'git',
                        maxConcurrentProcesses: 6,
                     };
                    const GIT: SimpleGit = simpleGit(options);
            
                    debug(`Initialize git repo`)
                    GIT.init()
                        .then(() => GIT.addRemote('origin', this.git))

                }
                parentContext.dependencies.push(dependency)
                config.save( {context: parentContext} )
            }

            debug(`Add new workspace to the .gitignore of the current context`)
            let gitignore = path.join(process.cwd(),'.gitignore')
            fs.appendFile(gitignore, '\n'+location, function (err) {
                if (err) throw err;
                debug(`Added to .gitignore`)
            });
        }
        
        console.log(`Workspace [${chalk.green(workspace)}] created @ [${fullPath}]`)

    }

}

export function register ():any {
    debug(`Registering....`)
    let command = new Workspace();
    debug(`INIT: ${JSON.stringify(Object.getOwnPropertyNames(command))}`)

    return command.build()
}

