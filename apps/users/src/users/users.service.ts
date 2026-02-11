import {
  Injectable,
  NotFoundException,
  RequestTimeoutException,
} from '@nestjs/common';
import { CreateUserDto } from '@app/contracts/users/dto/create-user.dto';
import { UpdateUserDto } from '@app/contracts/users/dto/update-user.dto';
// import { CreateUserDto, UpdateUserDto } from '@app/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const passHash: string = await bcrypt.hash(createUserDto.password, 10);
      const { password: _, ...userData } = createUserDto;
      const createUserData = {
        ...userData,
        passwordhash: passHash,
      };
      console.log('Creating user with data:', createUserData);
      const user = this.userRepository.create(createUserData);
      return this.userRepository.save(user);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new RequestTimeoutException(
        'Failed to create user. Please try again later.',
      );
    }
  }

  findAll() {
    return `This action returns all users`;
  }

  async findOne(id: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: id.toString() },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new RequestTimeoutException(
        'Failed to create user. Please try again later.',
      );
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.findOne(id);
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      const { id: _, ...updateData } = updateUserDto;
      return this.userRepository.save(
        this.userRepository.merge(user, updateData),
      );
    } catch (error) {
      console.error('Error updating user:', error);
      throw new RequestTimeoutException(
        'Failed to update user. Please try again later.',
      );
    }
  }

  async remove(id: number) {
    try {
      const user = await this.userRepository.delete({
        id: id.toString(),
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new RequestTimeoutException(
        'Failed to create user. Please try again later.',
      );
    }
  }
}
