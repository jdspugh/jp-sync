# Usage

```
$ npm i -g @jp/jp-sync
```

Create a config file, jp-sync.config:

```
# Format:
#   <local directory> <remote server | $SERVERS> <nginx restart?>
/etc/nginx/conf.d  $SERVERS nginx
/var/www           $SERVERS
```

Start watching and syncing:

```
$ jp-sync
```

# Config Details

## $SERVERS

Entering $SERVERS as the second parameter in a line of the config file will include the comma separated list of servers in the $SERVERS environment variable excluding the current hostname i.e. the list of remote servers for this machine. This can assist is creating your own cloud of fault tolerant servers. To set $SERVERS edit your '/etc/environment' file e.g.

```
$ vim /etc/environment
```
```
PATH=...
SERVERS=<domain name 1>,<domain name 2>,...
```

## nginx

Specifying 'nginx' as the third parameter in a line will restart the nginx service after the rsync has completed. This is useful particularly for syncing nginx configuration files, but may have other uses also specific to your projects.

```
/etc/nginx/conf.d $SERVERS nginx
```

The above line in the configuration file will ensure each time files in ```/etc/nginx/conf.d``` directory are changed they are synced with the remote server(s) specified in the second parameter on the line. After syncronizing the nginx server will be restarted.