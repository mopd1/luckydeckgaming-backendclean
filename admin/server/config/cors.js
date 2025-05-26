const allowedOrigins = [
    'https://luckydeckgaming.com',
    'https://admin.luckydeckgaming.com',
    'http://localhost:8000',
    'http://localhost:3000',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:3000',
    'https://dsbuibabsihko.cloudfront.net',
    'http://13.60.228.103:3000',
    'http://luckydeckbetabucket.s3-website.eu-north-1.amazonaws.com',
    'http://ec2-13-60-228-103.eu-north-1.compute.amazonaws.com:3000',
    'http://luckydeckbetabucket.s3-website.us-west-2.amazonaws.com',
    'https://luckydeck-gaming-node20.eba-g65ct3bf.us-west-2.elasticbeanstalk.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];

const corsOptions = {
    origin: function(origin, callback) {
        // Log origin attempts for debugging
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'cors_origin_check',
            origin: origin
        }));

        // In development, allow all origins
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }

        // In production, check against allowedOrigins
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.error(JSON.stringify({
                timestamp: new Date().toISOString(),
                event: 'cors_rejection',
                origin: origin
            }));
            callback(new Error('Origin not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false,
    maxAge: 86400 // 24 hours
};

module.exports = {
    allowedOrigins,
    corsOptions
};
