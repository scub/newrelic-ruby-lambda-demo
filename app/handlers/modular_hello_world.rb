module Handlers
    module HelloWorld
        def self.handle(event:, context:)
            NewRelic::Agent.notice_error(Exception.new("Exception.new"))
            NewRelic::Agent.notice_error("This is not an exception")

            raise Exception.new("This is uncaught")
            { statusCode: 200, body: "Hello, World!" }
        end
    end
end