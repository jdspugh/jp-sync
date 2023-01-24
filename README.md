# Use Cases

You can perform all use cases simultaneously by including all the settings you need in one config file.

## 1. Sync Local to Remotes

Watch and sync directories from a local machine to remote servers. This is useful for software development that needs to sync code and other files with a remote server for live testing. It can also be used for live remote backups.

```jp-sync.json```
```
[
  {
    "watch": ["/home/user/project1", "/home/user/project2"],
    "rsync": {
      "locations": ["username1@fqdn1:/var/www", "username2@fqdn2:/var/www"]
    }
  }, {
    "watch": ["/home/user/project3"],
    "rsync": {
      "locations": ["username3@fqdn3:/home/user"]
    }
  }
]
```

## 2. Cloud Sync

Create an efficient decentralised, replicated, fault tolerant cloud that keeps data in specified directories consistent with each other on a specified set of servers.

```jp-sync.json```
```
[
  {
    "watch": ["/etc/nginx/conf.d"],
    "cloud": {
      "serversEnvVar": "SERVERS",
      "username": "root"
    },
    "postSyncCmd": "service nginx restart"
  }, {
    "watch": ["/home/user/project1"],
    "cloud": {
      "serversEnvVar": "SERVERS",
      "username": "root"
    },
    "postSyncCmd": "service project1.service restart"
  }
]
```

## 3. Live Local Backups

Backup to an external hard drive connected to your local machine.

```jp-sync.json```
```
[
  {
    "watch": ["test1"],
    "rsync": {
      "destinations": ["test2"],
    }
  }
]
```

# Requirements

1. ```fswatch``` must be available on your system.  

1. ```rsync``` must be installed on the local and remote machines with the relavant certificates configured so that it can sync to remote servers without asking for the password.

MacOS: ```$ brew install fswatch rsync```

Ubuntu: ```$ sudo apt install fswatch rsync```

# Usage

1. Install:

    ```
    $ npm install --global @jdsp/sync
    ```

2. Create a config file, ```sync.json```, according to your use case listed above.

3. Start watching and syncingby executing this sync in the same directory as the config file:

    ```
    $ ls
    sync.json
    $ sync
    ```

# sync.json

## watch

An array of local directories to watch for syncing.

## rsync locations

An array of rsync locations. The syntax of these is the same as that of an rsync destination i.e. ```fqdn1:path```.

## rsync params

Include any rsync parameters you like. By default the ```-r``` option is included to recursively sync directories.

## cloud serversEnvVar

Add a comma separated list of servers to an environemnt variable e.g. ```SERVERS```. To set this edit your ```/etc/environment``` file and add the line:

```
SERVERS=<fqdn1>,<fqdn2>,...
```

## cloud username

This is the username that will be used to access all servers in ```serversEnvVar```. It is equivalent to ```rsync <username>@<fqdn>:<path> ...```.

## postSyncCmd

Enter a command line command to be executed after the rsync completes e.g.: ```service nginx restart```