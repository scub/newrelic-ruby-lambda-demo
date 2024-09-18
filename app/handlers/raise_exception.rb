# frozen_string_literal: true

def handle(event:, context:)
    NewRelic::Agent.notice_error(Exception.new("Exception.new"))
    NewRelic::Agent.notice_error("This is not an exception")
    
    raise "This is an exception!"
    { statusCode: 200, body: "Hello, World!" }
end