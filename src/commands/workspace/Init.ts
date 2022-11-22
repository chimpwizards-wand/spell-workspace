import Debug from 'debug';
import { Command } from  '@chimpwizards/wand'
import { Config } from '@chimpwizards/wand'
import { CommandDefinition, CommandParameter, CommandArgument } from '@chimpwizards/wand/commons/command/'

import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';  

const chalk = require('chalk');
const debug = Debug("w:cli:workspace:init");
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';

@CommandDefinition({ 
    description: 'Initialize wand workspace for current location',
    alias: 'i',
    parent: 'workspace',  
    examples: [
        [`w workspace init`, `Create workspace config in the current folder`],
    ]
})
export class Init extends Command  { 

    @CommandParameter({ description: 'Workspace name', alias: 'n',})
    name: string = "";

    @CommandParameter({ description: 'Git Origanization URI', alias: 'o',})
    organization: string = "";

    execute(yargs: any): void {
        debug(`THIS ${JSON.stringify(this)}`)
        debug(`YARGS ${JSON.stringify(yargs)}`)

        const config = new Config();
        let context: any = config.load({})
        let dir = process.cwd()

        if (context && context.local && context.local.root == dir) {
            console.log(chalk.red(`WAND configuration already exists here`))
            return;
        }

        //If name is not defined then use current folder as name
        let workspace = this.name || path.basename(process.cwd());
        debug(`Workspace: ${workspace}`)


        const options: SimpleGitOptions = {
            baseDir: dir,
            binary: 'git',
            maxConcurrentProcesses: 6,
            //config: []
         };
         
        const GIT: SimpleGit = simpleGit(options);

        //check if .git folder exists
        let gitpath: string = path.join(
            process.cwd(),
            '.git'
        );

        if (!fs.existsSync(gitpath)) {
            debug(`Initialize .git folder `)
            let giturl = this.organization + "/" + workspace;
            GIT.init().then(() => {
                    GIT.addRemote('origin', giturl);
                    this.initializeWand(workspace, dir);
            })
        } else {

            debug(`Get remote folders`)
            GIT.getRemotes().then( (remotes) => {
                debug(`Remotes: ${JSON.stringify(remotes)}`)
                this.initializeWand(workspace, dir)
            });
        }

    }

    initializeWand(workspace: string, dir: string) {
        const config = new Config();
        let context: any = {
            name: workspace
            //git: TODO: Take it from the remote
            //organization: TODO: Take it from the remote
        };

        if (this.organization && this.organization.length>0) {
            debug(`Organization is provided add/update metadata`)
            context['organization'] = this.organization;
        }


        const fullPath = config.save( {dir: dir, context: context, forceNew: true})

        console.log(`Workspace [${chalk.green(workspace)}] created @ [${fullPath}]`)
    }

}

export function register ():any {
    debug(`Registering....`)
    let command = new Init();
    debug(`INIT: ${JSON.stringify(Object.getOwnPropertyNames(command))}`)

    return command.build()
}

