import psList from 'ps-list'

const processes = await psList()

const javaProcesses = processes.filter((process) => process.name === 'java' && process.cmd.includes('restheart'))
console.log(javaProcesses)
