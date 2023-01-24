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
 * @param {Array<string>} cloudServers - array of fqdns
 * @param {Array<string>} rsyncParams
 * @returns {void}
 */
function rsync(batchedFiles, rsyncDestinations, cloudServers, rsyncParams) {
  D('rsync() batchedFiles=',batchedFiles,'rsyncDestinations=',rsyncDestinations,'remoteCloudServers=',cloudServers,'rsyncParams=',rsyncParams)
  if (0 == batchedFiles.length) return

  /**@ts-ignore*/
  let p = shortestPath(batchedFiles).replace(/\/$/,'') // remove trailing slash
  rsyncParams.push('-r') // do recursive rsyncs by default
  rsyncDestinations.forEach(l=>{
    D('rsync() rsyncDestinations rsync',[...rsyncParams,p,l].join(' '))
    const s = spawnSync('rsync',[...rsyncParams,p,l],{shell:true,stdio:['inherit','inherit','inherit']})
  })
  cloudServers.forEach(l=>{
    D('rsync() remoteCloudServers p=',p,'l=',l)
    // TODO: specifiy rsync username@fqdn in config file
    const s = spawnSync('rsync',[...rsyncParams,p,`root@${l}:${path.dirname(p)}`],{shell:true,stdio:['inherit','inherit','inherit']})
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
 * @param {string} cloudUsername
 * @param {Array<string>} cloudServers - array of fqdns
 * @param {string} postSyncCmd - post sync command
 * @returns {void}
 */
function watch(dirs, rsyncDestinations, rsyncParams, cloudUsername, cloudServers, postSyncCmd) {
  D('watch() dirs=',dirs,'rsyncDestinations=',rsyncDestinations,'rsyncParams=',rsyncParams,'cloudUsername=',cloudUsername,'cloudServers=',cloudServers,'postSyncCmd=',postSyncCmd)
  dirs.forEach(dir => {

    // initial sync
    rsync([dir],rsyncDestinations,cloudServers,rsyncParams)

    // ongoing syncs
    const s=spawn('fswatch',['-r',dir])
    //   process fswatch output
    s.stdout.on('data',d=>{// NOTE: fswatch can return a batch of changes (in a string separated by newlines)
      d=d.toString().slice(0,-1).split('\n')
      D('fswatch stdout.on(data) array d=',d)
      rsync(d,rsyncDestinations,cloudServers,rsyncParams)
      if (postSyncCmd) spawnSync(postSyncCmd)
      // if (postSyncCmd) spawnSync(postSyncCmd,{uid:0,gid:0})
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
    const c=entry['cloud'], e=c?.['serversEnvVar'], r=entry['rsync'], u=c?.['username']
    watch(
      entry['watch'],
      r['destinations'],
      r['params'] || [],
      u,
      /**@ts-ignore*/
      e ? process.env[e].split(',').filter(s=>s!=os.hostname()).map(s=>`${u}@${s}`) : [],
      entry['postSyncCmd']
    )
  })
}