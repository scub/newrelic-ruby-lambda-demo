#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, LayerVersion, Function, Runtime, ParamsAndSecretsLayerVersion, ParamsAndSecretsVersions } from 'aws-cdk-lib/aws-lambda';
import { BundlingFileAccess, DockerImage, Duration } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

export class NewrelicRubyLambdaDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const exclude = [
      'package-lock.json',
      'Gemfile.lock',
      'build_resources',
      'node_modules',
      'cdk.out',
      'README.md',
    ]

    // Hardcoding
    const newrelic_account_id  = '00000'
    const newrelic_license_key = '0000000000000000000000000000000'

    // Sourcing values from SecretsManager
    // const newrelic_secret = Secret.fromSecretNameV2(this, 'NewRelicSecret', '/standard/new_relic_keys')
    // const newrelic_license_key = newrelic_secret.secretValueFromJson('NEW_RELIC_LICENSE_KEY').unsafeUnwrap()
    // const newrelic_account_id  = newrelic_secret.secretValueFromJson('NEW_RELIC_ACCOUNT_ID').unsafeUnwrap()

    // Sourcing values from ssm
    // const newrelic_license_key = StringParameter.valueFromLookup(this, '/standard/NEW_RELIC_LICENSE_KEY')
    // const newrelic_account_id  = StringParameter.valueFromLookup(this, '/standard/NEW_RELIC_ACCOUNT_ID')

    const environment = {
      // this env var is the path to the ruby gems layer
      GEM_PATH: '/opt/ruby/3.2.0',

      // see https://github.com/rubygems/rubygems/issues/5893
      BUNDLE_FROZEN: 'true',

      // set any new relic environment variables here
      NEW_RELIC_ACCOUNT_ID: newrelic_account_id,
      NEW_RELIC_LICENSE_KEY: newrelic_license_key,
      NEW_RELIC_EXTENSION_LOGS_ENABLED: 'true',
      NEW_RELIC_EXTENSION_LOG_LEVEL: 'trace',
      NEW_RELIC_LOG_ENDPOINT: 'https://log-api.newrelic.com/log/v1',
      NEW_RELIC_TELEMETRY_ENDPOINT: 'https://cloud-collector.newrelic.com/aws/lambda/v1',

      // Reporting logs to new relic
      NEW_RELIC_EXTENSION_SEND_FUNCTION_LOGS: 'true',
      NEW_RELIC_LOG_LEVEL: 'debug', //'info', // debug, info, warn, error, fatal
    }

    let STAGE = process.env.STAGE ? process.env.STAGE : 'test'

    // Build our custom lambda layer
    const gemLayer = new LayerVersion(this, 'GemLayer', {
      layerVersionName: `custom-ruby-gems`,
      code: Code.fromAsset('.', {
          bundling: {
              platform: 'linux/amd64',
              image: DockerImage.fromRegistry(Runtime.RUBY_3_2.bundlingImage.image),
              command: [
                  'bash',
                  '-c',
                  [
                      'bundle config set --local path "/asset-output"',
                      'bundle config set --local without "development test"',
                      'bundle install',
                      'rm -rf .bundle',
                  ].join(' && '),
              ],
              bundlingFileAccess: BundlingFileAccess.VOLUME_COPY,
          },
      }),
    });

    // Source the newrelic gem layer from the zip
    const newrelicGemLayer = new LayerVersion(this, 'NewrelicGemLayer', {
      layerVersionName: 'newrelic-ruby-lambda-layer',
      code: Code.fromAsset('build_resources/ruby32.x86_64.zip')
    });

    // Source the newrelic gem layer directly from upstream
    // https://layers.newrelic-external.com/
    // const newrelicGemLayer = LayerVersion.fromLayerVersionArn(this, 'NewrelicGemLayer', 'arn:aws:lambda:us-east-1:451483290750:layer:NewRelicRuby32:11')

    // Basic lambda function w/ custom gem path
    new Function(this, 'RubyLambdaHelloWorld', {
      functionName: `ruby-lambda-hello-world-${STAGE}`,
      runtime: Runtime.RUBY_3_2,
      code: Code.fromAsset('./', { exclude: exclude }),
      handler: 'newrelic_lambda_wrapper.handler',
      environment: {
        NEW_RELIC_LAMBDA_HANDLER: 'app/handlers/hello_world.handle',
        ...environment
      },
      layers: [newrelicGemLayer, gemLayer],
      retryAttempts: 0,
      timeout: Duration.seconds(30),
    });

    // Modular lambda function w/ custom gem path
    new Function(this, 'RubyLambdaModularHelloWorld', {
      functionName: `ruby-lambda-modular-world-${STAGE}`,
      runtime: Runtime.RUBY_3_2,
      code: Code.fromAsset('./', { exclude: exclude }),
      handler: 'newrelic_lambda_wrapper.handler',
      environment: {
        NEW_RELIC_LAMBDA_HANDLER: 'app/handlers/modular_hello_world.Handlers::HelloWorld.handle',
        ...environment
      },
      layers: [newrelicGemLayer, gemLayer],
      retryAttempts: 0,
      timeout: Duration.seconds(30),
    });

    // Raising an exception from a lambda function causes forces request to timeout
    new Function(this, 'RubyLambdaRaiseException', {
      functionName: `ruby-lambda-raise-exception-${STAGE}`,
      runtime: Runtime.RUBY_3_2,
      code: Code.fromAsset('./', { exclude: exclude }),
      handler: 'newrelic_lambda_wrapper.handler',
      environment: {
        NEW_RELIC_LAMBDA_HANDLER: 'app/handlers/raise_exception.handle',
        ...environment
      },
      layers: [newrelicGemLayer, gemLayer],
      retryAttempts: 0,
      timeout: Duration.seconds(30),
    });

    // Using the example from New Relic support https://github.com/keegoid-nr/examples/tree/2457fdc5e885a73b02b777124368e26d6b44013a/lambda/sam/ruby/src/ruby33
    new Function(this, 'RubyLambdaNewRelicExample', {
      functionName: `ruby-lambda-newrelic-exception-${STAGE}`,
      runtime: Runtime.RUBY_3_2,
      code: Code.fromAsset('./', { exclude: exclude }),
      handler: 'newrelic_lambda_wrapper.handler',
      environment: {
        NEW_RELIC_LAMBDA_HANDLER: 'app/handlers/newrelic_provided_example.App.handler',
        ...environment
      },
      layers: [newrelicGemLayer, gemLayer],
      retryAttempts: 0,
      timeout: Duration.seconds(30),
    });

    // Bringing basic lambda function w/ custom gem path in line with New Relic support example
    new Function(this, 'RubyLambdaNewHelloWorld', {
      functionName: `ruby-lambda-new-hello-world-${STAGE}`,
      runtime: Runtime.RUBY_3_2,
      code: Code.fromAsset('./', { exclude: exclude }),
      handler: 'newrelic_lambda_wrapper.handler',
      environment: {
        NEW_RELIC_LAMBDA_HANDLER: 'app/handlers/updated_hello_world.App.handler',
        ...environment
      },
      layers: [newrelicGemLayer, gemLayer],
      retryAttempts: 0,
      timeout: Duration.seconds(30),
    });

  }
}

const app = new cdk.App();
new NewrelicRubyLambdaDemoStack(app, 'NewrelicRubyLambdaDemoStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
