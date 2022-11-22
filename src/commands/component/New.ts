import Debug from 'debug';
import { Command, Config } from  '@chimpwizards/wand'
import { CommandDefinition, CommandParameter, CommandArgument } from '@chimpwizards/wand/commons/command/'

import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';  
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';


const chalk = require('chalk');
const debug = Debug("w:cli:component:new");

@CommandDefinition({ 
    description: 'Create  a new component into the current workspace',
    alias: 'n',
    parent: 'component',  //TODO: Get the parent from the folder structure
    examples: [
        [`w component new helloworld`, `Creates a new component into current workspace`],
        [`w component new --git git@github.com:acme/helloworld.git `, `Creates a new component into current workspace`],
        [`w component new --name helloworld`, `Creates a new component into current workspace and gives helloworld as name`],
        [`w component new --name helloworld --template react`, `Creates a new component into current workspace and gives helloworld as name and scaffold using the react template`],
    ]
})
export class New extends Command  {

    @CommandArgument({ description: 'component Name', name: 'component-name'})
    @CommandParameter({ description: 'component Name', alias: 'n',})
    name: string = '';

    @CommandParameter({ description: 'Location of the component. if not provided components/<name> will be used', alias: 'l',})
    location: string= "";    

    @CommandParameter({ description: 'Git repository URI. If not provided will be calculated using the workspace organization', alias: 'g',})
    git: string = "";

    @CommandParameter({ description: 'Type of visibility this repo has [private|public]', alias: 'v',})
    visibility: string = "";

    @CommandParameter({ description: 'Prefix the git repository with the contet name', alias: 'p', defaults: false})
    prefix: boolean = false;

    @CommandParameter({ description: 'Component namespace ', alias: 's',})
    namespace: string = "";

    @CommandParameter({ description: 'Template to use to scaffold the component', alias: 'm'})
    template: string = "";

    @CommandParameter({ description: 'Comma separated list of tags to classify the component', alias: 't'})
    tags: string = "";


    execute(yargs: any): void {
        
        debug(`component ${this.name}`)
        
        debug(`THIS ${JSON.stringify(this)}`)
        debug(`YARGS ${JSON.stringify(yargs)}`)

        const config = new Config();
        let context: any = config.load({})
        
        //If name is not defined then use current folder as name
        let component = this.name;
        if (!component|| component.length==0) {

            //Cannot create a component without name when located at the root of the workspace
            if ( context.local.root == process.cwd()) {
                console.log(chalk.red(`component name needs to be provided`))
                return;
            }

            //Assume current folder as name
            component = path.basename(process.cwd());

            //Set location
            if (this.location.length==0){
                let parent = path.dirname(process.cwd());
                this.location = `${parent}/${component}`;
                this.location = this.location.replace(context.local.root,"").slice(1)
            }
        } else {
            //If name provided but location. Assume components folder
            if (this.location.length==0){
                let parent = context.componentsLocation || 'components'
                this.location = `${parent}/${component}`;                
            }
        }

        
        debug(`Name: ${component}`)        
        debug(`Location ${this.location}`)
        
        
        //If git not provided calculated from organization
        if (this.git.length==0) {
            if ( context.organization ) {
                this.git = `${context.organization}/${(context.name && this.prefix)?context.name+'-':''}${component}`
            } else {
                console.log(chalk.red(`Git repository cannot be infered. Please provide`))
            }

        }

        let exists =  false;
        if (context.components) {
            exists = _.find(context.components, {path: this.location})
        } else {
            debug(`Creating components bucket in config`)  
            context['components'] = []  
        }

        if (exists) {
            console.log(chalk.red(`component ${this.name} already exists in ${this.location}`))
            return
        }

        //Add metadata
        let componentDefinition: any = {
            path: this.location,
            git: this.git,
        }

        //Add visibility
        if (this.visibility && this.visibility.length > 0) {
            componentDefinition['visibility'] = this.visibility;
        }
        componentDefinition['tags'] =this.location.split("/")
        context.components.push(componentDefinition)
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
        
        
        console.log(`component [${chalk.green(component)}] created @ [${this.location}]`)

    } 


}

export function register ():any {
    debug(`Registering....`)
    let command = new New();
    debug(`INIT: ${JSON.stringify(Object.getOwnPropertyNames(command))}`)

    return command.build()
}

