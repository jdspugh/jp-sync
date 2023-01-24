import os from 'os'
import path from 'path'
import { spawn,spawnSync } from 'child_process'
import { promises as fs } from 'fs'

const D=console.log

/**
 * Rsync an array of directories returned by fswatch to an array of remote hosts,
 * syncing to each remote host in sequence, synchronously.
 * 
 * Because fswatch will batch (virtually) simultaneously modified files into an array,
 * we can optimise the rsync operation to rsync the shortest directory containing all changes
 * rathan than spawning a bunch of rsync commands.
 * @param {Array<string>} batchedFiles 
 * @param {Array<string>} rsyncDestinations
 * @param {Array<string>} remoteCloudServers - array of fqdns
 * @param {Array<string>} rsyncParams
 * @returns {void}
 */
function rsync(batchedFiles, rsyncDestinations, remoteCloudServers, rsyncParams) {
  D('rsync() batchedFiles=',batchedFiles,'rsyncDestinations=',rsyncDestinations,'remoteCloudServers=',remoteCloudServers,'rsyncParams=',rsyncParams)
  if (0 == batchedFiles.length) return

  /**@ts-ignore*/
  let p = shortestPath(batchedFiles).replace(/\/$/,'') // remove trailing slash
  rsyncDestinations.forEach(l=>{
    D('rsync() rsyncDestinations rsync',[...rsyncParams,p,l].join(' '))
    const s = spawnSync('rsync',[...rsyncParams,p,l],{uid:0,gid:0})
    // const s = spawnSync('rsync',['--exclude=.*','-Plauvze','ssh -p 2255',p,l],{uid:0,gid:0})
    console.error('rsync err: '+s.stderr);D('rsync out: '+s.stdout)
  })
  remoteCloudServers.forEach(l=>{
    D('rsync() remoteCloudServers p=',p,'l=',l)
    const s = spawnSync('rsync',[...rsyncParams,p,`root@${l}:${path.dirname(p)}`],{uid:0,gid:0})
    // const s = spawnSync('rsync',['--exclude=.*','-Plauvze','ssh -p 2255',p,`root@${l}:${path.dirname(p)}`],{uid:0,gid:0})
    console.error('rsync err: '+s.stderr);D('rsync out: '+s.stdout)
  })
}

/**
 * Return shortest path (from array of paths).
 * @param {Array<string>} dirs 
 * @returns {string | undefined}
 */
function shortestPath(dirs) {
  D('shortestPath() dirs=',dirs)
  let sd, sp = Number.MAX_VALUE
  for(const d of dirs) {
    const l = d.split(path.sep).length
    if (l<sp) {sd=d; sp=l}
  }
  /**@ts-ignore*/
  const result = dirs.length>1 ? path.dirname(sd) : sd
  D('shortestPath() result=',result)
  return result
}

/**
 * Watch for changes within the directory.
 * @param {Array<string>} dirs - array of local directories
 * @param {Array<string>} rsyncDestinations - array of rsync remote host locations
 * @param {Array<string>} rsyncParams
 * @param {Array<string>} remoteCloudServers - array of fqdns
 * @param {string} postSyncCmd - post sync command
 * @returns {void}
 */
function watch(dirs, rsyncDestinations, rsyncParams, remoteCloudServers, postSyncCmd) {
  D('watch() dirs=',dirs,'rsyncDestinations=',rsyncDestinations,'rsyncParams=',rsyncParams,'remoteCloudServers=',remoteCloudServers,'postSyncCmd=',postSyncCmd)
  dirs.forEach(dir => {

    // initial sync
    rsync([dir],rsyncDestinations,remoteCloudServers, rsyncParams)

    // ongoing syncs
    // const s=spawn('inotifywait',['-qmre','create,modify,attrib,moved_to,move_self,delete_self','--format','%e|%w%f',dir],{uid:0,gid:0})
    const s=spawn('fswatch',['-r',dir],{uid:0,gid:0}) // see https://github.com/emcrisostomo/fswatch/blob/ec824c84d5225b713b18e182e4ab45747a263042/libfswatch/src/libfswatch/c/cevent.cpp
    // const s=spawn('fswatch',['-re','.*','--event','Created','--event','Updated','--event','Removed','--event','Renamed','--event','OwnerModified','--event','AttributeModified','--event','MovedFrom','--event','MovedTo',dir],{uid:0,gid:0}) // see https://github.com/emcrisostomo/fswatch/blob/ec824c84d5225b713b18e182e4ab45747a263042/libfswatch/src/libfswatch/c/cevent.cpp
    //   process fswatch output
    s.stdout.on('data',d=>{// NOTE: fswatch can return a batch of changes
      D('fswatch stdout.on(data) string d='+d)
      d=d.toString().slice(0,-1).split('\n')
      // d=d.toString().slice(0,-1).split(/\n|\|/)
      D('fswatch stdout.on(data) array d=',d)
      const batchedFiles=[]
      for(let i=1;i<d.length;i+=2)batchedFiles.push(d[i])
      rsync(batchedFiles,rsyncDestinations,remoteCloudServers, rsyncParams)
      if (postSyncCmd) spawnSync(postSyncCmd,{uid:0,gid:0})
    })
    //   output fswatch errors
    s.stderr.on('data',d=>D('stderr.on(data) d='+d))

  })
}

// main
{
  let j

  // read config file
  try {
    let c = process.argv[2] || 'jp-sync.json'
    D('Using configuration file:',c)
    j = JSON.parse(await fs.readFile(c,'utf8'))
  } catch (e) {
    if ('ENOENT' == e.code){D('Configuration file not found.');process.exit(1)}
  }

  // process config file
  j.forEach(entry => {
    const serversEnvVar = entry['serversEnvVar']
    watch(
      entry['watch'],
      entry['rsyncDestinations'],
      entry['rsyncParams'] || [],
      /**@ts-ignore*/
      serversEnvVar ? process.env[serversEnvVar].split(',').filter(s=>s!=os.hostname()) : [],
      entry['postSyncCmd']
    )
  })
}