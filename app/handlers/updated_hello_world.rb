# frozen_string_literal: true

class App
  def self.handler(event:, context:)
    puts "Forced unhandled error"
    raise "Forced unhandled error"
    { statusCode: 200, body: "Hello, World!" }
  end
end
