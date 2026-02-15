// This middleware logs authentication attempts.
// It should only be active in development to avoid leaking sensitive information.

const logAuthAttempt = (req, res, next) => {
  // Enable logging only in development mode for security.
  if (process.env.NODE_ENV === 'development') {
    const { email } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const timestamp = new Date().toISOString();

    // Log successful authentication
    res.on('finish', () => {
      if (res.locals.authSuccess) {
        const username = res.locals.username || email;
        console.log(
          `[${timestamp}] [AUTH SUCCESS] - IP: ${ip}, User: ${username}`
        );
      }
    });

    // Log failed authentication
    res.on('finish', () => {
      if (res.locals.authFailure) {
        console.log(
          `[${timestamp}] [AUTH FAILURE] - IP: ${ip}, User: ${email || 'N/A'}`
        );
      }
    });
  }
  next();
};

export default logAuthAttempt;
