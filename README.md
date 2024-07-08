# RESTHeart CLI Tool

## Introduction

The RESTHeart CLI tool, named `rh`, is designed to assist developers in implementing [plugins for RESTHeart](https://restheart.org/docs/plugins/overview). It provides various commands to manage the lifecycle of RESTHeart, including installing, building, running, testing, and watching for changes.

### Prerequisites

Before using the CLI tool, ensure that you have the following installed:

-   Node.js (version 16.x or higher)
-   npm
-   Maven (`mvn`)
-   Java Development Kit (JDK) 17 or higher

The CLI tool must be run within a Maven project as it relies on Maven for building and deploying the plugins.

> You could install and manage both `mvn` and `java` with [sdkman](https://sdkman.io/).

## Installation

To install the `rh` CLI tool globally, clone the repository and run npm install:

```sh
git clone <repository-url>
cd <repository-directory>
npm install -g .
```

## Usage

The CLI tool supports multiple commands. Below is the list of available commands and their usage.

### Commands

1. **install [restheartVersion]**

    Install a specific version of RESTHeart.

    ```sh
    Usage: rn install [restheartVersion]

    Options:
      --force, -f  Force reinstalling RESTHeart
    ```

2. **build**

    Build and deploy the plugin, restarting RESTHeart (default).

    ```sh
    Usage: rn build
    ```

3. **run [restheartOptions..]**

    Start or restart RESTHeart with optional build and additional options.

    ```sh
    Usage: rn run -- [restheartOptions..]

    Options:
      --build, -b  Build and deploy the plugin before running RESTHeart
      --port, -p   HTTP port
    ```

4. **test**

    Start or restart RESTHeart for integration tests (e.g., `mvn verify`).

    ```sh
    Usage: rn test
    ```

5. **kill**

    Kill RESTHeart.

    ```sh
    Usage: rn kill

    Options:
      --port, -p  HTTP port
    ```

6. **watch**

    Watch sources and build and deploy plugins on changes, restarting RESTHeart.

    ```sh
    Usage: rn watch

    Options:
      --build, -b  Build and deploy the plugin before running RESTHeart
      --port, -p   HTTP port
    ```

### Global Options

-   **--debug, -d**

    Run in debug mode.

-   **--help, -h**

    Display help for commands.

### Examples

-   Install the latest version of RESTHeart:

    ```sh
    rn install
    ```

-   Install a specific version of RESTHeart:

    ```sh
    rn install 8.0.3
    ```

-   Force reinstall RESTHeart:

    ```sh
    rn install --force
    ```

-   Print the installed RESTHeart version and exit:

    ```sh
    rh run -- "-v"
    ```

-   Build and deploy the plugin:

    ```sh
    rn build
    ```

-   Run RESTHeart on a specific port (default is 8080). By default it looks for a `etc/dev.yml` [override file](https://restheart.org/docs/configuration#modify-the-configuration-with-an-override-file). Any parameter after the `--` separator is passed as is to restheart.jar.

    ```sh
    rh run --port 8080 -- "-o etc/localhost.yml"
    ```

-   Run RESTHeart with build:

    ```sh
    rn run --build
    ```

-   Kill RESTHeart:

    ```sh
    rn kill
    ```

-   Watch for changes and restart RESTHeart. By default it looks for a `etc/dev.yml` [override file](https://restheart.org/docs/configuration#modify-the-configuration-with-an-override-file). Any parameter after the `--` separator is passed as is to restheart.jar.

    ```sh
    rn watch -- "-o etc/localhost.yml"
    ```

## Contribution

If you would like to contribute to the project, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -m 'Add new feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Create a Pull Request.

## License

This project is licensed under the MIT License.

## Contact

For any issues or questions, please open an issue on the [GitHub repository](repository-url).

---

Made with :heart: by [SoftInstigate](https://www.softinstigate.com). Follow us on [Twitter](https://twitter.com/softinstigate).
