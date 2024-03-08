module Handlers
    module HelloWorld
        def self.handle(event:, context:)
            { statusCode: 200, body: "Hello, World!" }
        end
    end
end