import os from 'os'
import path from 'path'
import { spawn,spawnSync } from 'child_process'
import { promises as fs } from 'fs'
// configure:
//   each line's format: <dir to sync> <server to sync to> <restart nginx?>
//   vim jp-sync.config
//     + /var/www $SERVERS
//     + /etc/nginx/conf.d $SERVERS nginx
//     + ...
//   or
//     + digitalnomadfinder.com sg.gamecast.dev:/var/www
//     + ...
//
// usage:
//     $ sudo node jp-sync.mjs
//   or
//     $ node i jp-sync -g
//     $ sudo jp-sync
const D=console.log
const REMOTE_HOSTS = process.env.SERVERS.split(',').filter(s=>s!=os.hostname()) // remote hostnames

// rsync an array of directories to an array of remote hosts
function rsync(dirs,hosts) {
  D('rsync() dirs=',dirs,'hosts=',hosts)
  const p = shortestPath(dirs).replace(/\/$/,'') // remove trailing slash
  hosts.forEach(h=>{
    const s=spawnSync('rsync',['--exclude=.*','-Plauvze','ssh -p 2255',p,`root@${h}:${path.dirname(p)}`],{uid:0,gid:0})
    console.error('rsync err: '+s.stderr)
    D('rsync out: '+s.stdout)
  })
}

// return shortest path (from array of paths)
function shortestPath(dirs) {
  D('shortestPath() dirs=',dirs)
  let sd, sp = Number.MAX_VALUE
  for(const d of dirs) {
    //D('d=',d)
    const l = d.split(path.sep).length
    if (l<sp) {sd=d; sp=l}
  }
  const result = dirs.length>1 ? path.dirname(sd) : sd
  D('shortestPath() result=',result)
  return result
}

// listen for changes
function watch(d,r,n) {// params: directory array, remote hosts, restart nginx?
  D('watch() directory=',d,'remote hosts=',r,'restart nginx?=',n)
  rsync([d],r)
  const s=spawn('inotifywait',['-qmre','create,modify,attrib,moved_to,move_self,delete_self','--format','%e|%w%f',d],{uid:0,gid:0})
  s.stdout.on('data',d=>{// NOTE: inotify can return more than one change at a time
    D('inotifywait stdout.on(data) d='+d)
    d=d.toString().slice(0,-1).split(/\n|\|/)
    D('d=',d)
    const a=[]
    for(let i=1;i<d.length;i+=2)a.push(d[i])
    rsync(a,r)
    if(n)spawnSync('service',['nginx','reload'],{uid:0,gid:0})
  })
  s.stderr.on('data',d=>D('stderr.on(data) d='+d));s.on('exit',d=>D('exit d=',d))
}

// process config file
{
  const n = 'jp-sync.config'
  const s = await fs.readFile(n,'utf8')
  D(n+'\n')
  D(s,'\n')
  const a = s.split('\n').filter(l=>l&&'#'!=l[0].trim()).map(l=>l.split(/\s+/)) // [[<dir1>,<remote hosts1>,<restart nginx1?>],[<dir2>,<remote hosts2>,<restart nginx2>],...]
  a.forEach(l => { // l = line as array of words
    const dir = l[0]
    const servers = '$SERVERS'==l[1]?REMOTE_HOSTS:l[1]
    const nginx = 'nginx'==l[2]
    watch(dir,servers,nginx)
  }) // process lines
}