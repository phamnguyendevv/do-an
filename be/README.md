# Serverless NestJS

## Required

- Node.js node:22.14.0
- Docker, Docker Compose

## Architecture Overview

### Packaging Rules

Current Package Structure and Future Ideal Structure

```
.
├── src - The root directory for the application's source code.
│   ├── adapters - This layer contains interface adapters that convert data between the format most convenient for entities and use cases and the format most convenient for some external agency such as the Database or the Web.
│   │   ├── controllers - Controllers handle incoming HTTP requests and return responses to the client. They act as a bridge between the web and the application logic.
│   │   │   ├── common - Common utilities and helpers for controllers.
│   │   │   │   ├── guards - Guards are used to protect routes and enforce authorization.
│   │   │   │   ├── decorators - Custom decorators for enhancing controller classes, methods, or parameters.
│   │   │   │   ├── middlewares - Middleware functions that process requests before they reach the controllers (only applicable to specific controllers).
│   │   │   └── [feature] - A directory dedicated to a specific feature of the application, containing related controllers.
│   │   │       ├── dto - Data Transfer Objects (DTOs) are used to define the format of data as it is transferred from the client to the server.
│   │   │       ├── presenters - Presenters are responsible for transforming data from the format most convenient for the use cases and entities into a format that can be returned to and understood by the client.
│   │   │       └── [feature].controller.ts - A specific controller for handling requests related to a feature.
│   │   └── gateways - Gateways are responsible for handling real-time communication, often through WebSockets.
│   │       └── [feature] - A directory for gateways related to a specific feature.
│   │           ├── dto - Similar to controllers, these DTOs are for the input data in real-time communication.
│   │           ├── presenters - Presenters for transforming output data in real-time communication.
│   │           └── [feature].gateway.ts - A specific gateway for handling real-time events related to a feature.
│   │
│   ├── domain - This layer contains the business logic of the application. It is the heart of the application.
│   │   ├── entities - Domain entities are the business objects of the application.
│   │   ├── utils - Pure functions and helpers that can be used across different use cases.
│   │   │   └── [utility].utils.ts - Specific utility functions for various purposes, such as string.utils.ts, datetime.utils.ts, etc.
│   │   ├── repositories - Interfaces for the data access layer. They abstract the persistence layer, allowing the use cases to access the data without knowing the implementation details.
│   │   ├── services - Interfaces for the application services. These interfaces define the contracts for the infrastructure layer to implement, including services that interact with third-party services or external APIs.
│   │   ├── config - Configuration interfaces specific to the domain layer.
│   │   ├── exceptions - Custom exceptions that represent errors within the domain layer.
│   │   └── logger - Interfaces for logging, allowing the domain layer to log information without depending on a specific logging implementation.
│   │
│   ├── infrastructure - This layer contains implementations of the interfaces defined in the domain layer, such as repositories and loggers, as well as other infrastructure concerns.
│   │   ├── databases - Implementations of the data access layer for specific databases.
│   │   │   └── postgresql - PostgreSQL database implementations.
│   │   │       ├── entities - TypeORM entities that map the application's domain entities to database tables.
│   │   │       ├── repositories - Implementations of the repository interfaces for PostgreSQL using TypeORM.
│   │   │       ├── typeorm.config.ts - TypeORM configuration file.
│   │   │       └── typeorm.module.ts - TypeORM module setup.
│   │   ├── services - Implementations of infrastructure services, such as email services or external API clients.
│   │   ├── common - Common infrastructure utilities and helpers.
│   │   │   ├── filter - Exception filters for handling and transforming exceptions into HTTP responses.
│   │   │   ├── guards - Security guards for protecting routes and enforcing authorization.
│   │   │   ├── interceptors - Interceptors for manipulating request and response objects, or for cross-cutting concerns like logging or transaction management.
│   │   │   ├── pipes - Pipes for validation and data transformation.
│   │   │   ├── middlewares - Middleware functions that process requests before they reach the route handler (applicable globally, e.g., maintenance mode).
│   │   │   └── strategies - Authentication strategies for implementing various authentication mechanisms.
│   │   ├── config - Implementations of configuration services, for managing application settings.
│   │   ├── exceptions - Implementations of exception handling mechanisms.
│   │   └── logger - Implementations of the logging interface, providing concrete logging capabilities.
│   │
│   ├── use-cases - This layer contains the application-specific business rules. It encapsulates and implements all of the use cases of the system, handling business logic and interacting with repositories.
│   │
│   ├── modules - Organizational units that group related code together. Each module is dedicated to a specific area of functionality within the application.
│   │
│   ├── app.module.ts - The root module of the application. It ties all the modules together.
│   │
│   └── main.ts - The entry point of the application. It sets up the NestJS application and starts the server.
|
├── database - Contains database-related files, such as migrations, seeders, and scripts.
|
├── test - Contains testing-related files, including unit and integration tests.
│   └── stubs - Contains reusable mock data and stub objects for testing purposes.
|
├── docker-compose.yml - A Docker Compose configuration file for defining and running multi-container Docker applications.
├── Dockerfile - Contains instructions for Docker to build an image of the application.
|
├── serverless.yml - Configuration file for deploying the application using the Serverless Framework and running it on offline mode.
└── serverless_zip.sh - Shell script to create a ZIP file for deploying a Serverless application.
```

## Get started

### Set up `app`

#### 1. Copy `.env.example` to `.env`

```console
cp .env.example .env
```

_note: Please fill in the necessary environment variables in the `.env` file._

#### 2. Build the application

```console
docker-compose build
```

### Run up app container service

```console
docker-compose up
```

### Initialize Husky (only Local Environment)

The first time after running `docker-compose up`, initialize Husky by running:

```console
npx husky
```

## App Server

Open http://localhost:3000

## API Documentation

Open http://localhost:3000/api

## Maintenance Mode

To enable maintenance mode, set the `MAINTENANCE_MODE` environment variable to `true` and set the `MAINTENANCE_MESSAGE` environment variable to the message you want to display.

```env
MAINTENANCE_MODE=true
```

When maintenance mode is enabled, all incoming requests will receive a `503 Service Unavailable` response with a maintenance message.

## Commands

### Execute in the container

```console
docker exec -it app-api bash
```

### Install package

```console
docker exec -it app-api npm install <package-name>
```

### Run test

```console
# Run coverage test
docker exec -it app-api npm run test:cov

# Run all tests
docker exec -it app-api npm run test

# Run test watch with debug
docker exec -it app-api npm run test:watch <test-file>
```

## Database Migration

Run database migration:

```console
# Up
docker exec -it app-api npm run migration:run

# Down
docker exec -it app-api npm run migration:revert

# Generate migration by entity
docker exec -it app-api npm run migration:generate --name=<migration-name>

# Create migration
docker exec -it app-api npm run migration:create --name=<migration-name>
```

## Serverless

Zip the application:

```console
docker exec -it app-api sh serverless_zip.sh
```
