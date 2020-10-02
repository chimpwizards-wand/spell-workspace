import Debug from 'debug';
import { Command } from  '@chimpwizards/wand'
import { Config } from '@chimpwizards/wand'
import { CommandDefinition, CommandParameter, CommandArgument } from '@chimpwizards/wand/commons/command/'

import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';  
const progress = require('cli-progress');

const chalk = require('chalk');
const debug = Debug("w:cli:workspace");
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import { clone } from 'lodash';


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
        
        this.cloneRepo(this.git, process.cwd())
    }

    cloneRepo(git: string, location: string) {
        debug(`Cloning repo ${git} into ${location}`)
        let workspace = git.split("/").reverse()[0].replace(".git","");
        let dir = (this.location.length==0)?path.join(location,workspace):this.location;
        debug(`WORKSPACE: ${workspace}`)
        debug(`LOCATION: ${dir}`)

        const repoExists = (fs.existsSync(dir));

        if (repoExists) {
            debug(`There is already a repo in this location ${dir}`)
            console.log(chalk.red(`There is already a repo in this location ${dir}`))
            //Do nothing
            return
        }

        debug(`Configure git cli`)
        const options: SimpleGitOptions = {
            baseDir: process.cwd(),
            binary: 'git',
            maxConcurrentProcesses: 6,
         };
        const GIT: SimpleGit = simpleGit(options);

        debug(`Clonign repo ${workspace} into ${dir}`)
        GIT.clone(this.git, dir)
            .then(() => {
                console.log(`Repository ${workspace} has been cloned @ ${dir}`)

                const config = new Config();

                debug(`Check if current folder belongs to a context`)
                if (config.inContext({dir: process.cwd()})) {
                    debug(`Add new workspace into current one`)
                    const parentContext = config.load({dir: dir})
        
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
        
                debug(`Check if new workspace has .wand config and pull all dependencies`)
                if (config.inContext({dir: dir})) {
                    let newContext = config.load({dir: dir});
                    //If context its located in the new workspace location
                    if (newContext.local.root == dir) {                
                        this.cloneTree(dir)              
                    }
                }
            })
            .catch((err) => {
                debug(`ERROR: ${err}`)
                console.error('failed: ', err)
            });
    }

    cloneTree(dir: string) {
        debug(`Cloaning tree ${dir}`)
        let config = new Config();
        let newContext = config.load({dir: dir});
        const bar = new progress.SingleBar({
            format: 'Cloning |' + chalk.cyan('{bar}') + '| {percentage}% || {value}/{total} Dependencies || {dependency}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        bar.start(newContext.dependencies.length, 0, {
            dependency: "Preparing"
        });

        _.each(newContext.dependencies, (pack) => {
            debug(`Cloning (${pack.path})`)
            
            let dDir = path.join(dir, pack.path)

            if (!fs.existsSync(dDir)) {
                fs.mkdirSync(dDir, {recursive: true});
            }

            this.cloneRepo(pack.git,dDir)

            bar.increment({dependency: pack.path});

        });
        bar.stop();

    }



}

export function register ():any {
    debug(`Registering....`)
    let command = new Clone();
    debug(`INIT: ${JSON.stringify(Object.getOwnPropertyNames(command))}`)

    return command.build()
}

