# Swarm Sites

Swarm sites is an http server for serving swarm websites and SPAs requested via
regular DNS by non `.eth` domains. It works like Github Pages but for Swarm.

[![Automated by Buddy](https://assets.buddy.works/automated-dark.svg)](https://buddy.works)

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
    @ IN TXT swarm=2018:pre bzz=a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a type=website
    ```

Record description:

* `swarm=2018:pre` – record version `2018:pre`.
* `bzz=...` - swarm BZZ address
* `type=website` - _optional_ specifies resource type. Currently `website` is
default and the only supported value.

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

* [ ] HTTPs support:
    * [ ] Let's Encrypt certificates generation.
    * [ ] Auto renewal.
* [ ] Routing for sites to better support of SPA.
* [ ] Better error pages.
* [ ] Write tests.
* [ ] Add Swarm API mockups for test purposes.
* [x] Custom sites types:
    * [x] Website.
    * [x] SPA.

## License

MIT.
