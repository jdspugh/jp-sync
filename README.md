# Use Cases

## Sync Projects (between local and remote machines)

Use this tool to watch and sync code/files/projects from your local machine to one or more remote servers. Each project can be specified to sync to its own specific destination server and path on that server.

## Personal Cloud

Use the $SERVERS parameter to create a personal fault tolerant cloud that keeps data on a set of servers consistent with each other. Set ```jp-sync``` up as a service so it starts on reboot.

# Requirements

Rsync must be installed on the local and remote machines, preferably with the relavant certificates so that it can access remote servers without asking for the password.

Nginx must of course be installed in order to use the nginx restart feature.

# Usage

```
$ npm i -g @jp/jp-sync
```

Create a config file, jp-sync.config:

```
# Format:
#   <local directory> <remote server location | $SERVERS> <nginx restart?>
/etc/nginx/conf.d  $SERVERS nginx
/var/www           $SERVERS
project1           fqdn1:/home/username
project2           fqdn2:/var/www
```

Start watching and syncing:

```
$ jp-sync
```

# Config Details

## Remote Server Location

Each directory can have it's own remote server location specified. The syntax of these is the same as that of an rsync destination i.e. ```fqdn1:path```

## $SERVERS

Entering $SERVERS as the second parameter in a line of the config file will include the comma separated list of servers in the $SERVERS environment variable excluding the current hostname i.e. the list of remote servers for this machine. This can assist is creating your own cloud of fault tolerant servers. To set $SERVERS edit your '/etc/environment' file e.g.

```
$ vim /etc/environment
```
```
PATH=...
SERVERS=<fqdn1>,<fqdn2>,...
```

## nginx

Specifying 'nginx' as the third parameter in a line will restart the nginx service after the rsync has completed. This is useful particularly for syncing nginx configuration files, but may have other uses also specific to your projects.

```
/etc/nginx/conf.d $SERVERS nginx
```

The above line in the configuration file will ensure each time files in ```/etc/nginx/conf.d``` directory are changed they are synced with the remote server(s) specified in the second parameter on the line. After syncronizing the nginx server will be restarted.