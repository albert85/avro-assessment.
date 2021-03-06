/* eslint-disable no-empty-function */
/* eslint-disable no-unused-vars */
import bcrypt from 'bcryptjs';

import db from '../../db/models';
import { handleResponse } from '../helpers/handleResponse';
import ValidateToken from '../helpers/handleToken';

const numWeeks = 8;
const now = new Date();
const eightWeeks = now.setDate(now.getDate() + numWeeks * 7);
class User {
  static async signup(req, res) {
    const {
      password, name, email, address,
    } = req.body;
    const hashPassword = await bcrypt.hash(password, 10);
    const checkIfUserExist = await db.User({
      email,
    });

    if (checkIfUserExist) {
      return handleResponse(res, 400, false, 'Member already exist');
    }

    const newUser = await User.create({
      password: hashPassword,
      name,
      address,
      email,
    });

    const checkIfMemberExist = await db.ClubMember({
      clubId: req.user.clubId,
      userId: newUser.id,
    });

    if (checkIfMemberExist) {
      return handleResponse(res, 400, false, 'Member already exist');
    }

    await db.ClubMember.create({
      clubId: req.user.clubId,
      userId: newUser.id,
      role: req.user.role,
    });

    const token = ValidateToken.generateToken(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: req.user.role,
      },
      eightWeeks,
    );

    return handleResponse(
      res,
      201,
      'Success',
      'Account created Successfully and an otp as been sent to',
      { token },
    );
  }

  static async signin(req, res) {
    const {
      body: { password, email },
    } = req;
    const user = await db.User.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      return handleResponse(res, 404, false, 'Email not found');
    }

    const verifyPassword = await bcrypt.compare(password, user.password);

    if (verifyPassword) {
      const clubMember = await db.ClubMember.findOne({
        where: {
          clubId: req.params.clubId,
          userId: user.id,
        },
      });


      if (!clubMember) {
        return handleResponse(res, 404, false, 'You are not a member/admin of the club');
      }

      const token = ValidateToken.generateToken(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: clubMember.role,
        },
        eightWeeks,
      );
      return handleResponse(res, 200, 'Success', 'Login successfully', {
        token,
        user: {
          name: user.name,
          address: user.address,
          email: user.email,
        },
      });
    }
    return handleResponse(
      res,
      400,
      'Failed',
      'Email or password incorrect',
      {},
    );
  }
}

export default User;
