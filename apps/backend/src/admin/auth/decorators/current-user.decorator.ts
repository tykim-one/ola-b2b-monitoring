import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ValidatedUser } from '../strategies/jwt.strategy';

type UserProperty = keyof ValidatedUser | 'sub';

export const CurrentUser = createParamDecorator(
  (data: UserProperty | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: ValidatedUser = request.user;

    if (!data) {
      return user;
    }

    // Map 'sub' to 'userId' for convenience
    if (data === 'sub') {
      return user?.userId;
    }

    return user?.[data];
  },
);
