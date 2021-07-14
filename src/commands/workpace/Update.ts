import Debug from 'debug';
import { Command } from  '@chimpwizards/wand'
import { Config } from '@chimpwizards/wand'
import { CommandDefinition, CommandParameter, CommandArgument } from '@chimpwizards/wand/commons/command/'
import { Clone } from './Clone'

import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';  
const progress = require('cli-progress');

const chalk = require('chalk');
const debug = Debug("w:cli:workspace:update");
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';

@CommandDefinition({ 
    description: 'Update current workspace/project',
    alias: 'u',
    parent: "workspace",
    examples: [
        [`w workspace update`, `Update current workspace`],
    ]
})
export class Update extends Command  { 

    @CommandParameter({ description: 'Location', alias: 'l'})
    location: string= "";   

    @CommandParameter({ description: 'Deep level', alias: 'd', defaults: 5})
    deepLevel: number= 5;   

    @CommandParameter({ description: 'Include private components', alias: 'p', defaults: false})
    includePrivates: boolean = false;  

    execute(yargs: any): void {
        //debug(`THIS ${JSON.stringify(this)}`)
        debug(`YARGS ${JSON.stringify(yargs)}`)

        let config = new Config();
        let context = config.load({});

        this.updateRepo((this.location.length==0)?context.local.root||process.cwd():this.location,'')
    }

    updateRepo(target: string, relativePath: string) {
        debug(`Updating repo @ ${relativePath}`)
        let dir = path.join(target,relativePath);
        debug(`LOCATION: ${dir}`)

        const isGitPresent = (fs.existsSync(path.join(dir,'.git')));
        if (isGitPresent) {
            debug(`GIT present @ ${dir}`)

            const options: SimpleGitOptions = {
                baseDir: dir,
                binary: 'git',
                maxConcurrentProcesses: 6,
                //config: []
            };
            const GIT: SimpleGit = simpleGit(options);

            GIT.getRemotes(true).then( (remotes) => {
                debug(`Remotes: ${JSON.stringify(remotes)}`)
                var originURL = remotes.find(x => x.name == "origin")

                if ( originURL && originURL?.refs?.fetch != "") {
    
                    debug(`Update repo ${target}`)
                    GIT.pull()
                        .then(() => {
                            console.log(`Repository has been updated @ ${dir}`)

                            this.updateDependencies(dir)
                        })
                        .catch((err) => {
                            console.log(`Error updating repository @ ${dir}. Enable debugging [w:cli:workspace:update] to see error details`)
                            debug(`ERROR: ${err}`)
                            //console.error(chalk.red(`failed:`), err)
                        });
                } else {
                    debug(`GIT remote is not set @ ${dir}`)
                }
            });
        } else {
            debug(`GIT IS NOT present @ ${dir}`)
            debug(`${target}/.git folder doesn't exists`)
            console.log(chalk.red(`.git Folder doesn't exists. It might be becase the git has not been initialized.`))

            this.updateDependencies(dir)
            
        }
    }

    updateDependencies(dir:string) {
        let config = new Config();
        debug(`Check if updated repo is a workspace and pull all dependencies`)
        if (config.inContext({dir: dir})) {
            debug(`Pull dependencies for  repo`)
            let newContext = config.load({dir: dir});
            
            debug(`Context root: ${newContext.local.root}`)
            debug(`Workspace dir: ${dir}`)
            if (newContext.local.root == dir) {   
                debug(`Current context its located in the new workspace location`)
                this.deepLevel--;
                
                if (this.deepLevel>0) {
                    this.updateTree(dir)              
                } else {
                    debug(`Deep level reached`)
                    console.log(chalk.red(`Deep level reached.`));
                    console.log(chalk.red(`Incerase it if you like to pull more levels of dependency`))
                }
            }
        }
    }

    updateTree(dir: string) {
        debug(`Update tree ${dir}`)
        let config = new Config();
        let newContext = config.load({dir: dir});
        

        let dependencies: any = []
        //Add dependencies
        if (newContext.dependencies) {
            _.each(newContext.dependencies||[], (pack, name) => {
                let add: boolean = false;
                if (!pack.visibility || _.lowerCase(pack.visibility) == "public") {
                    add = true;
                } 
                if (pack.visibility && _.lowerCase(pack.visibility) == "private" && this.includePrivates) {
                    add = true;
                }
                if (add) {
                    dependencies.push(pack)
                }
            })
        
        }  

        const bar = new progress.SingleBar({
            format: 'Updating |' + chalk.cyan('{bar}') + '| {percentage}% || {value}/{total} Dependencies || {dependency}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        bar.start(dependencies.length, 0, {
            dependency: "Preparing"
        });
        _.each(dependencies, (pack) => {
            let dDir = path.join(dir, pack.path)
            
            debug(`Updating (${pack.path})`)
            if (fs.existsSync(dDir)) {
                this.updateRepo(dir, pack.path)
            } else {
                let clone = new Clone()
                clone.cloneRepo(pack.git,dir, pack.path)
            }
            
            bar.increment({dependency: pack.path});

        });
        bar.stop();

    }
    



}

export function register ():any {
    debug(`Registering....`)
    let command = new Update();
    debug(`INIT: ${JSON.stringify(Object.getOwnPropertyNames(command))}`)

    return command.build()
}

