import Debug from 'debug';
import { Command, Config } from  '@chimpwizards/wand'
import { CommandDefinition, CommandParameter, CommandArgument } from '@chimpwizards/wand/commons/command/'

import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';  
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';


const chalk = require('chalk');
const debug = Debug("w:cli:dependency:new");

@CommandDefinition({ 
    description: 'Create  a new dependency into the current workspace',
    alias: 'n',
    parent: 'dependency',  //TODO: Get the parent from the folder structure
    examples: [
        [`w dependency new helloworld`, `Creates a new dependency into current workspace`],
        [`w dependency new --git git@github.com:acme/helloworld.git `, `Creates a new dependency into current workspace`],
        [`w dependency new --name helloworld`, `Creates a new dependency into current workspace and gives helloworld as name`],
    ]
})
export class New extends Command  {

    @CommandArgument({ description: 'Dependency Name', name: 'dependency-name'})
    @CommandParameter({ description: 'Dependency Name', alias: 'n',})
    name: string = '';

    @CommandParameter({ description: 'Location of the dependency. if not provided dependencies/<name> will be used', alias: 'l',})
    location: string= "";    

    @CommandParameter({ description: 'Git repository URI. If not provided will be calculated using the workspace organization', alias: 'g',})
    git: string = "";

    @CommandParameter({ description: 'Type of visibility this repo has [private|public]', alias: 'v',})
    visibility: string = "";

    @CommandParameter({ description: 'Prefix the git repository with the contet name', alias: 'p', defaults: false})
    prefix: boolean = false;

    execute(yargs: any): void {
        
        debug(`Dependency ${this.name}`)
        
        debug(`THIS ${JSON.stringify(this)}`)
        debug(`YARGS ${JSON.stringify(yargs)}`)

        const config = new Config();
        let context: any = config.load({})
        
        //If name is not defined then use current folder as name
        let dependency = this.name;
        if (!dependency|| dependency.length==0) {

            //Cannot create a dependency without name when located at the root of the workspace
            if ( context.local.root == process.cwd()) {
                console.log(chalk.red(`Dependency name needs to be provided`))
                return;
            }

            //Assume current folder as name
            dependency = path.basename(process.cwd());

            //Set location
            if (this.location.length==0){
                let parent = path.dirname(process.cwd());
                this.location = `${parent}/${dependency}`;
                this.location = this.location.replace(context.local.root,"").slice(1)
            }
        } else {
            //If name provided but location. Assume dependencies folder
            if (this.location.length==0){
                let parent = context.dependenciesLocation || 'dependencies'
                this.location = `${parent}/${dependency}`;                
            }
        }

        
        debug(`Name: ${dependency}`)        
        debug(`Location ${this.location}`)
        
        
        //If git not provided calculated from organization
        if (this.git.length==0) {
            if ( context.organization ) {
                this.git = `${context.organization}/${(context.name && this.prefix)?context.name+'-':''}${dependency}`
            } else {
                console.log(chalk.red(`Git repository cannot be infered. Please provide`))
            }

        }

        let exists =  false;
        if (context.dependencies) {
            exists = _.find(context.dependencies, {path: this.location})
        } else {
            debug(`Creating dependencies bucket in config`)  
            context['dependencies'] = []  
        }

        if (exists) {
            console.log(chalk.red(`Dependency ${this.name} already exists in ${this.location}`))
            return
        }

        //Add metadata
        let dependencyDefinition: any = {
            path: this.location,
            git: this.git,
        }

        //Add visibility
        if (this.visibility && this.visibility.length > 0) {
            dependencyDefinition['visibility'] = this.visibility;
        }
        dependencyDefinition['tags'] =this.location.split("/")
        context.dependencies.push(dependencyDefinition)
        config.save( {context:context} )


        //Create folder
        let dir = path.join(
            context.local.root,
            this.location
        )
        debug(`Dir: ${dir}`)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true});
        }

        debug(`Configure git cli`)
        const options: SimpleGitOptions = {
            baseDir: dir,
            binary: 'git',
            maxConcurrentProcesses: 6,
            //config: []
            };
        const GIT: SimpleGit = simpleGit(options);

        debug(`Initialize git repo`)
        GIT.init()
            .then(() => GIT.addRemote('origin', this.git))


        debug(`Add new workspace to the .gitignore of the current context`)
        let gitignore = path.join(context.local.root,'.gitignore')
        fs.appendFile(gitignore, '\n'+this.location, function (err) {
            if (err) throw err;
            debug(`Added to .gitignore`)
        });
        
        
        console.log(`Dependency [${chalk.green(dependency)}] created @ [${this.location}]`)

    } 


}

export function register ():any {
    debug(`Registering....`)
    let command = new New();
    debug(`INIT: ${JSON.stringify(Object.getOwnPropertyNames(command))}`)

    return command.build()
}

