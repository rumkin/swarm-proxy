# Swarm Sites

Swarm sites is an http server for serving swarm sites requested via regular DNS
system by non .eth domains. It works like Github Pages but for Swarm.

**NOTE!** SwarmSite is in beta.

## Usage

To link your regular domain to Swarm you need to add two DNS Records into DNS
configuration file or management panel:

1. Add `A` record to map requests to SwarmSites IP:
    ```text
    @ 3600 IN A 159.65.169.224
    ```
2. Add `TXT` record to match hostname with BZZ resource:
    ```text
    @ IN TXT bzz=a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a
    ```

When records are updated you can open site with a browser.

## Install

Install via git:

```bash
git clone https://github.com/rumkin/swarm-sites
cd swarm-sites
npm i .
node cli.js start
```

To run swarm sites with nginx and systemd there is two files with example configuration:

```text
var/swarm-sites.nginx
var/swarm-sites.systemd
```

## TODO

* HTTPs support:
    * Let's Encrypt certificates generation.
    * Auto renewal.
* Routing for sites to better support of SPA.
* Better error pages.
* Write tests.
* Add Swarm API mockups for test purposes.

## License

MIT.
