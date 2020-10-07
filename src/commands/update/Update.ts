import Debug from 'debug';
import { Command } from  '@chimpwizards/wand'
import { Config } from '@chimpwizards/wand'
import { CommandDefinition, CommandParameter, CommandArgument } from '@chimpwizards/wand/commons/command/'
import { Clone } from '../clone/Clone'

import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';  
const progress = require('cli-progress');

const chalk = require('chalk');
const debug = Debug("w:cli:workspace:clone");
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';

@CommandDefinition({ 
    description: 'Update current workspace/project',
    alias: 'u',
    parent: "workspace",
    examples: [
        [`workspace clone git@github.com:acme/helloworld.git`, `Clone an existing workspace`],
    ]
})
export class Update extends Command  { 

    @CommandParameter({ description: 'Location'})
    location: string= "";   

    @CommandParameter({ description: 'Deep level', defaults: 5})
    deepLevel: number= 5;   

    execute(yargs: any): void {
        debug(`THIS ${JSON.stringify(this)}`)
        debug(`YARGS ${JSON.stringify(yargs)}`)

        this.updateRepo((this.location.length==0)?process.cwd():this.location,'')
    }

    updateRepo(target: string, relativePath: string) {
        debug(`Updating repo @ ${relativePath}`)
        let dir = path.join(target,relativePath);
        debug(`LOCATION: ${dir}`)

        const options: SimpleGitOptions = {
            baseDir: target,
            binary: 'git',
            maxConcurrentProcesses: 6,
         };
        const GIT: SimpleGit = simpleGit(options);
        debug(`Update repo ${target}`)
        GIT.pull("origin","master")
            .then(() => {
                console.log(`Repository has been updated @ ${target}`)

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
            })
            .catch((err) => {
                debug(`ERROR: ${err}`)
                console.error(chalk.red(`failed:`), err)
            });
    }

    updateTree(dir: string) {
        debug(`Update tree ${dir}`)
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

