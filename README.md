# New Relic Lambda Demo

This demo uses the AWS CDK to deploy a Ruby based Lambda which relies on a custom gem path.

## Important Links

- [List of New Relic Layers](https://layers.newrelic-external.com/)

## Getting Started

Before proceeding update the values for `NEW_RELIC_ACCOUNT_ID` and `NEW_RELIC_LICENSE_KEY` in the deployment configuration [build_resources/newrelic-ruby-lambda-demo.ts](./build_resources/newrelic-ruby-lambda-demo.ts#L28-L29)

With an authenticated AWS profile run the following to deploy a Cloudformation stack called `NewrelicRubyLambdaDemoStack`.

```bash
npm install
./node_modules/.bin/cdk deploy --all --require-approval never
```

## Stack resources

The `NewrelicRubyLambdaDemoStack` stack includes two lambda layers, one containing the dependencies in [Gemfile](./Gemfile) and the other is the New Relic layer. It also includes three lambda functions:

- `ruby-lambda-hello-world` ([app/handlers/hello_world](app/handlers/hello_world.rb)) - Simple example returns hello world
- `ruby-lambda-modular-world` ([app/handlers/modular_hello_world](app/handlers/modular_hello_world.rb)) - Same hello world but provided as a module
- `ruby-lambda-raise-exception` ([app/handlers/raise_exception](app/handlers/raise_exception.rb)) - Raising an uncaught exception appears to cause requests to stick open until the lambda timeout. (we would like to be able to have these show up in errors inbox)

## Highlights

Deployment configuration can be found at [./build_resources/newrelic-ruby-lambda-demo.ts](./build_resources/newrelic-ruby-lambda-demo.ts)
- The New Relic lambda layer is supplied through `build_resources/ruby32.x86_64.zip`
- The `GEM_PATH` is set to `/opt/ruby/3.2.0`.
    - It can be found in the `environment` object in the [deploy config](./build_resources/newrelic-ruby-lambda-demo.ts#L22)
    - Comment it out momentarily to get past the `"cannot load such file -- newrelic_rpm"` error
- The [ruby-lambda-modular-world](./app/handlers/modular_hello_world.rb) functions `NEW_RELIC_LAMBDA_HANDLER` is truncated to
`/var/task/app/handlers/modular_hello_world.Handlers::HelloWorld.rb`

## How to test

Once deployed, the lambdas can be invoked individually through the AWS console or using the cli:

```bash
aws lambda invoke --function-name ruby-lambda-hello-world-test /dev/stdout | jq .
aws lambda invoke --function-name ruby-lambda-modular-world-test /dev/stdout | jq .
aws lambda invoke --function-name ruby-lambda-raise-exception-test /dev/stdout | jq .
```
