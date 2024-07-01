import { Injectable } from '@nestjs/common';
import {
  CashOutDto,
  LoginDto,
} from '../common/dto/create-consultora-mutual.dto';
import axios, { AxiosRequestConfig } from 'axios';

@Injectable()
export class ConsultoraMutualService {
  private url = process.env.URL_GENERAL;
  async login(body: LoginDto) {
    const requestOptions: AxiosRequestConfig = {
      method: 'POST',
      url: `${this.url}/Login/LoginM`,
      data: body,
    };

    try {
      const response = await axios(requestOptions);
      return response.data;
    } catch (error) {
      console.log('Error:', error);
      throw new Error('Failed to get FX rate');
    }
  }

  async cashOut(body: CashOutDto) {
    const requestOptions: AxiosRequestConfig = {
      method: 'POST',
      url: `${this.url}/CobrosPagos/CreaTTAPI`,
      data: body,
    };

    try {
      const response = await axios(requestOptions);
      return response.data;
    } catch (error) {
      console.log('Error:', error);
      throw new Error('Failed to get FX rate');
    }
  }
  async getCustomerByAlias(alias: string) {
    const requestOptions: AxiosRequestConfig = {
      method: 'GET',
      url: `${this.url}/cvu/accounts?${alias}`,
    };

    try {
      const response = await axios(requestOptions);
      return response.data;
    } catch (error) {
      console.log('Error:', error);
      throw new Error('Failed to get FX rate');
    }
  }
  async getCustomerByCbu(cbu: string) {
    const requestOptions: AxiosRequestConfig = {
      method: 'GET',
      url: `${this.url}/cvu/accounts?cbu_cvu=${cbu}`,
    };

    try {
      const response = await axios(requestOptions);
      return response.data;
    } catch (error) {
      console.log('Error:', error);
      throw new Error('Failed to get FX rate');
    }
  }
}
