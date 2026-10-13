import amqplib from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE_NAME = 'ride_events';

export const publishNotification = async (routingKey: string, payload: any) => {
  try {
    const connection = await amqplib.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(JSON.stringify(payload)));
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error('RabbitMQ Publish Error:', error);
  }
};

export const startNotificationConsumer = async () => {
  try {
    const connection = await amqplib.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    const q = await channel.assertQueue('', { exclusive: true });
    await channel.bindQueue(q.queue, EXCHANGE_NAME, '#');

    channel.consume(q.queue, (msg) => {
      if (msg !== null) {
        const routingKey = msg.fields.routingKey;
        const content = JSON.parse(msg.content.toString());
        console.log(`[Notification] Event: ${routingKey}, Data: `, content);
        channel.ack(msg);
      }
    });
    console.log('Notification consumer started');
  } catch (error) {
    console.error('RabbitMQ Consumer Error:', error);
  }
};
