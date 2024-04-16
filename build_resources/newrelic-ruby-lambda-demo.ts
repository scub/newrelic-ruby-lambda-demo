#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, LayerVersion, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { BundlingFileAccess, DockerImage, Duration } from 'aws-cdk-lib';

export class NewrelicRubyLambdaDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const exclude = [
      'package-lock.json',
      'Gemfile.lock',
      'build_resources',
      'node_modules',
      'cdk.out',
    ]

    const environment = {
      // this env var is the path to the ruby gems layer
      GEM_PATH: '/opt/ruby/3.2.0',

      // see https://github.com/rubygems/rubygems/issues/5893
      BUNDLE_FROZEN: 'true',
      
      // set any new relic environment variables here
      NEW_RELIC_ACCOUNT_ID: '00000',
      NEW_RELIC_LICENSE_KEY: '0000000000000000000000000000000',
      NEW_RELIC_EXTENSION_LOGS_ENABLED: 'true',
      NEW_RELIC_EXTENSION_LOG_LEVEL: 'trace',
      NEW_RELIC_LOG_ENDPOINT: 'https://log-api.newrelic.com/log/v1',
      NEW_RELIC_TELEMETRY_ENDPOINT: 'https://cloud-collector.newrelic.com/aws/lambda/v1',

      // Reporting logs to new relic
      NEW_RELIC_EXTENSION_SEND_FUNCTION_LOGS: 'true',
      NEW_RELIC_LOG_LEVEL: 'info', // debug, info, warn, error, fatal
    }

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

    // Source the newrelic gem layer
    const newrelicGemLayer = new LayerVersion(this, 'NewrelicGemLayer', {
      layerVersionName: 'newrelic-ruby-lambda-layer',
      code: Code.fromAsset('build_resources/ruby32.x86_64.zip')
    });

    // Basic lambda function w/ custom gem path
    new Function(this, 'RubyLambdaHelloWorld', {
      functionName: 'ruby-lambda-hello-world',
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
      functionName: 'ruby-lambda-modular-world',
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
      functionName: 'ruby-lambda-raise-exception',
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
  }
}


const app = new cdk.App();
new NewrelicRubyLambdaDemoStack(app, 'NewrelicRubyLambdaDemoStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});