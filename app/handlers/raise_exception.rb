# frozen_string_literal: true

def handle(event:, context:)
    raise "This is an exception!"
    { statusCode: 200, body: "Hello, World!" }
end