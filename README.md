# OpenAPI MCP Server

A Model Context Protocol (MCP) server with `StreamableHTTP` transport implementation for handling OpenAPI specifications and model service interactions

## Overview

This server provides a standardized way to interact with model services through a RESTful API interface. It implements the Model Context Protocol (MCP) and is designed to be easily configurable. **Simply set up your `.env` file, and the server is ready to run.**

It implements the Model Context Protocol (MCP) specification and supports OpenAPI documentation.

## Features

- OpenAPI 3.0.0 compliant API documentation
- Model service API documentation retrieval
- Model service invocation with parameter handling
- TypeScript implementation for type safety

## Prerequisites

- Node.js (v20 or higher)
- npm (v6 or higher)

## Quick Start

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/oneWalker/openapi-mcp-server.git
    cd openapi-mcp-server
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure your environment:**
    Create a `.env` file in the project root and add your configuration. See the [Configuration](#configuration) section for details.

4.  **Run the server:**
    ```bash
    npm run build
    npm run start
    ```

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

## Development

### Building the Project

```bash
npm run build
```

### Running in Development Mode

```bash
npm run watch
```

### Starting the Server

```bash
npm  run start
```

## Configuration

Create a `.env` file in the root of the project to configure the server.

```
# The base URL for the original API server
BASE_SERVER_URL= https://api.example.com

# The path to the OpenAPI specification file (can be a local file or a URL).
OPENAPI_PATH=./example.yaml or ./example.json # example.yaml is just for demo

# The port for the MCP server to run on
PORT=8000
```

## API Endpoints

### Get Model Service API Documentation

```
GET /api/model/services/{ID}
```

Retrieves the API documentation for a specific model service.

**Parameters:**

- `ID` (path, required): Model service ID
- `authorization` (header, required): Bearer token for authentication

### Call Model Service

```
POST /api/model/services/
```

Invokes a specific model service with provided parameters.

**Parameters:**

- `id` (path, required): Model service ID

**Request Body:**

```json
{
  "id": "123"
}
```

## Project Structure

```
openapi-mcp-server/
├── src/              # Source code
├── build/            # Compiled JavaScript files
├── example.yaml # OpenAPI specification
├── package.json      # Project configuration
└── tsconfig.json     # TypeScript configuration
```

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please see the `CONTRIBUTING.md` file for details on our code of conduct, and the process for submitting pull requests to us.

## Reporting Issues

We use GitHub Issues to track public bugs. Report a bug by [opening a new issue](https://github.com/oneWalker/openapi-mcp-server/issues); it's that easy!

## Dependencies

- `openapi-mcp-generator`: OpenAPI specification generator
  - **Note:** This project requires a pending fix from the `openapi-mcp-generator` library. See this [pull request](https://github.com/harsha-iiiv/openapi-mcp-generator/pull/27).
- `@modelcontextprotocol/sdk`: MCP SDK for protocol implementation
- `express`: Web framework
- `dotenv`: Environment variable management
- `got`: HTTP client

## Development Dependencies

- `TypeScript`
- `@types/express`
- `@types/node`

## License

MIT License - See LICENSE file for details

## Authors

- [Brian,Kun Liu](https://github.com/oneWalker)
