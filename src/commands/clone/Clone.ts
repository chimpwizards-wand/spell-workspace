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
    location: string= "";    

    execute(yargs: any): void {
        debug(`URL ${this.git}`)
        
        debug(`Configure git cli`)
        const options: SimpleGitOptions = {
            baseDir: process.cwd(),
            binary: 'git',
            maxConcurrentProcesses: 6,
         };
        const GIT: SimpleGit = simpleGit(options);

        let workspace = this.git.split("/").reverse()[0].replace(".git","");
        let dir = (this.location.length==0)?path.join(process.cwd(),workspace):this.location;
        debug(`WORKSPACE: ${workspace}`)
        debug(`LOCATION: ${dir}`)

        debug(`Clonign repo ${workspace} into ${dir}`)
        GIT.clone(this.git, dir)
            .then(() => console.log(`Repository ${workspace} has been cloned @ ${dir}`))
            .catch((err) => {
                debug(`ERROR: ${err}`)
                console.error('failed: ', err)
            });

        //Add new workspace into existing one if needed
        const config = new Config();
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

            if (!exists) {
                debug(`Add the workspace to the current context becase doesn't exists`)
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

            debug(`Add new workspace to the .gitignore of the current context`)
            let gitignore = path.join(process.cwd(),'.gitignore')
            fs.appendFile(gitignore, '\n'+location, function (err) {
                if (err) throw err;
                debug(`Added to .gitignore`)
            });
        }
    }

}

export function register ():any {
    debug(`Registering....`)
    let command = new Clone();
    debug(`INIT: ${JSON.stringify(Object.getOwnPropertyNames(command))}`)

    return command.build()
}

