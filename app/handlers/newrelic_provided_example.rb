class App
  def self.handler(event:, context:)
    if event['raise_error']
      puts "Forced unhandled error"
      raise "Forced unhandled error"
    else
      raise "Actually an unhandled error in non-event invocation"
      begin
        # Simulate some work
        raise "Unhandled error in non-event invocation"
        if rand > 0.7
          raise "Random handled error stuff"
        end
        puts "Hello, world!"
        puts "Event size: #{event.size}"
        { statusCode: 200, body: JSON.generate("Hello from Ruby Lambda!") }
      rescue => e
        NewRelic::Agent.notice_error(e)
        puts "Handled error: #{e.message}"
        { statusCode: 500, body: "Handled error: #{e.message}" }
      end
    end
  end
end
