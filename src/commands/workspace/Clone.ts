import Debug from 'debug';
import { Command } from  '@chimpwizards/wand'
import { Config } from '@chimpwizards/wand'
import { CommandDefinition, CommandParameter, CommandArgument } from '@chimpwizards/wand/commons/command/'

import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';  
const progress = require('cli-progress');

const chalk = require('chalk');
const debug = Debug("w:cli:workspace:clone");
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';

@CommandDefinition({ 
    description: 'Clone existing workspace/project',
    alias: 'c',
    parent: "workspace",
    examples: [
        [`w workspace clone git@github.com:acme/helloworld.git`, `Clone an existing workspace`],
    ]
})
export class Clone extends Command  { 

    
    @CommandArgument({ description: 'Git repository URI', required: true})
    @CommandParameter({ description: 'Git repository URI', alias: 'g',})
    git: string = "";

    @CommandParameter({ description: 'Location', alias: 'l',})
    location: string= "";    

    @CommandParameter({ description: 'Deep level', alias: 'd', defaults: 5})
    deepLevel: number= 5;   

    @CommandParameter({ description: 'Include private components', alias: 'p', defaults: false})
    includePrivates: boolean = false;      

    execute(yargs: any): void {
        debug(`URL ${this.git}`)

        let workspace = this.git.split("/").reverse()[0].replace(".git","");
        this.cloneRepo(this.git, (this.location.length==0)?process.cwd():this.location, workspace)
    }

    cloneRepo(git: string, target: string, relativePath: string) {
        debug(`Cloning repo ${git} into ${relativePath}`)
        let dir = path.join(target,relativePath);
        debug(`LOCATION: ${dir}`)

        const parentExists = (fs.existsSync(target));
        if (!parentExists) {
            //Create
            fs.mkdirSync(target, {recursive: true});
        }
        const repoExists = (fs.existsSync(dir));

        if (repoExists) {
            debug(`There is already a repo in this location ${dir}`)
            console.log(chalk.red(`There is already a repo in this location ${dir}`))
            //Do nothing
            return
        }

        debug(`Configure git cli`)
        const options: SimpleGitOptions = {
            baseDir: target,
            binary: 'git',
            maxConcurrentProcesses: 6,
            //config: []
         };
        const GIT: SimpleGit = simpleGit(options);

        debug(`Clonign repo ${git} into ${dir}`)
        GIT.clone(git, dir)
            .then(() => {
                console.log(`Repository ${git} has been cloned @ ${dir}`)

                let config = new Config();

                debug(`Check if current folder belongs to a context`)
                if (config.inContext({dir: target})) {
                    debug(`Add new workspace into current one`)

                    const parentContext = config.load({dir: target})   // Find near context
        
                    debug(`Add the new folder as part of the dependencies of the parent`)
                    debug(`Keep path relative tot he root of the workspce`)
                    debug(`Current dir: ${dir}`)
                    debug(`Context root: ${parentContext.local.root}`)
                    
                    var parentRelativePath = dir.replace(parentContext.local.root,"")
                    if (parentRelativePath.startsWith("/")) {
                        parentRelativePath = parentRelativePath.slice(1) //Remove first stash/backstash
                    }

                    debug(`Relative location: ${parentRelativePath}`)
        
                    debug(`Check if workspace is already added into parent config`)
                    let exists =  false;
                    if (parentContext.dependencies) {
                        exists = _.find(parentContext.dependencies, {path:parentRelativePath})
                    } else {
                        debug(`Creating dependencies bucket in config`)
                        parentContext['dependencies'] = []
                    }
        
                    if (!exists) {
                        debug(`Add the workspace to the current context becase doesn't exists`)
                        let dependency: any = {
                            path: parentRelativePath,
                        }
                        dependency['tags'] =parentRelativePath.split("/")
                        dependency['tags'].push("workspace")

                        if (git && git.length>0) {
                            dependency['git'] = git;
                        }
                        parentContext.dependencies.push(dependency)
                        config.save( {context: parentContext} )

                        debug(`Add new workspace to the .gitignore of the current context`)
                        let gitignore = path.join(process.cwd(),'.gitignore')
                        fs.appendFile(gitignore, '\n'+parentRelativePath, function (err) {
                            if (err) throw err;
                            debug(`Added to .gitignore`)
                        });
                    }
                }
        
                debug(`Check if new workspace has .wand config and pull all dependencies`)
                if (config.inContext({dir: dir})) {
                    debug(`Pull dependencies for new cloned repo`)
                    let newContext = config.load({dir: dir});
                    
                    debug(`NEW Context root: ${newContext.local.root}`)
                    debug(`Workspace dir: ${dir}`)
                    if (newContext.local.root == dir) {   
                        debug(`Current context its located in the new workspace location`)
                        this.deepLevel--;
                        
                        if (this.deepLevel>0) {
                            this.cloneTree(dir)              
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

    cloneTree(dir: string) {
        debug(`Cloaning tree ${dir}`)
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
            format: 'Cloning |' + chalk.cyan('{bar}') + '| {percentage}% || {value}/{total} Dependencies || {dependency}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        bar.start(dependencies.length, 0, {
            dependency: "Preparing"
        });

        _.each(dependencies, (pack) => {
            let dDir = path.join(dir, pack.path)

            debug(`Cloning (${pack.path})`)
            if (!fs.existsSync(dDir)) {
                let parent = path.dirname(dDir);
                fs.mkdirSync(parent, {recursive: true});
            }

            this.cloneRepo(pack.git,dir, pack.path)
            

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

