require('dotenv').config()
import ProviderController from '../../controllers/ProviderController'
import httpMocks from 'node-mocks-http'
import { Request, Response } from 'express'
import { faker } from '@faker-js/faker'
const Provider = require('../../models/Provider')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')

describe('When adding providers', () => {
  interface TypedResponse extends Response {
    statusCode: any
    _getData: () => any
  }

  let req: Request
  let Controller: any
  let res: TypedResponse

  const mockAxios = new MockAdapter(axios)

  const payload = {
    user_id: 1,
    name: 'Backlog',
    api_key: '123apikey123',
    project_id: faker.datatype.number()
  }

  const payload2 = {
    user_id: 1,
    name: 'Backlog',
    api_key: '123apikey123',
    project_id: faker.datatype.number()
  }

  beforeEach(() => {
    req = httpMocks.createRequest()
    res = httpMocks.createResponse()
    Controller = new ProviderController()
    mockAxios.onGet('/api/v2/space', { params: { apiKey: payload.api_key } }).reply(200, {
      spaceKey: 'nulab',
      name: 'Nulab Inc.',
      ownerId: 1
    })
    mockAxios
      .onGet(`/api/v2/projects/${payload.project_id}`, { params: { apiKey: payload.api_key } })
      .reply(200, {
        id: 1,
        projectKey: 'TEST',
        name: 'test'
      })
    mockAxios
      .onGet(`/api/v2/projects/${payload2.project_id}`, { params: { apiKey: payload.api_key } })
      .reply(200, {
        id: 1,
        projectKey: 'TEST',
        name: 'test'
      })
  })

  it('should insert provider successfully', async () => {
    req.body = payload
    await Controller.add(req, res)
    expect(res.statusCode).toEqual(200)
    expect(res._getData()).toMatchObject({
      user_id: 1,
      name: 'Backlog',
      space_key: 'nulab',
      api_key: '123apikey123'
    })
  })

  it('should throw an error if Project already registered', async () => {
    req.body = payload
    await Controller.add(req, res)
    expect(res.statusCode).toEqual(400)
  })

  it('should return validation errors if incorrect payload', async () => {
    await Controller.add(req, res)
    expect(res.statusCode).toEqual(422)
    expect(res._getData()).toMatchObject([
      {
        parameter: 'user_id',
        value: undefined,
        message: 'Required value.'
      },
      { parameter: 'name', value: undefined, message: 'Required value.' },
      {
        parameter: 'project_id',
        value: undefined,
        message: 'Required value.'
      }
    ])
  })

  it('should return array of objects', async () => {
    req.body = payload
    await Controller.add(req, res)
    const data = res._getData()
    req.query = { user_id: data.user_id }
    await Controller.getProviders(req, res)
    const result = res._getData()
    expect.arrayContaining(result)
  })
})

describe('When getting list of providers', () => {
  interface TypedResponse extends Response {
    statusCode: any
    _getData: () => any
  }

  let req: Request
  let Controller: any
  let res: TypedResponse

  beforeEach(() => {
    req = httpMocks.createRequest()
    res = httpMocks.createResponse()
    Controller = new ProviderController()
  })

  it('should return an empty array if no data from DB', async () => {
    /* @ts-ignore */
    req.query = { user_id: 999999 }
    await Controller.getProviders(req, res)
    const data = res._getData()
    expect(data).toStrictEqual([])
  })

  it('should return validation error when user id is invalid', async () => {
    req.query = { user_id: 'test' }
    await Controller.getProviders(req, res)
    const data = res._getData()
    expect(data).toMatchObject([
      { message: 'Incorrect type. Expected number.', parameter: 'user_id', value: 'test' }
    ])
  })
})

describe('When using getProviderById() function', () => {
  interface TypedResponse extends Response {
    statusCode: any
    _getData: () => any
  }

  let req: Request
  let Controller: any
  let res: TypedResponse

  beforeEach(() => {
    req = httpMocks.createRequest()
    res = httpMocks.createResponse()
    Controller = new ProviderController()
  })

  describe('if ID is not a number', () => {
    beforeEach(async () => {
      req.params = { id: 'as' }
      await Controller.getProviderById(req, res)
    })

    it('should return a status of 400', () => {
      expect(res.statusCode).toEqual(400)
    })

    it('should return the expected error message', () => {
      const data = res._getData()

      expect(JSON.parse(data)).toHaveProperty('message', 'Invalid ID')
    })
  })

  describe('if ID does not exist', () => {
    beforeEach(async () => {
      jest.spyOn(Provider.prototype, 'getProviderById').mockImplementationOnce(() => null)

      req.params = { id: '11111' }
      await Controller.getProviderById(req, res)
    })

    it('should return a status of 404', () => {
      expect(res.statusCode).toEqual(404)
    })

    it('should return the expected error message', () => {
      const data = res._getData()

      expect(JSON.parse(data)).toHaveProperty('message', 'No Provider Found')
    })
  })

  describe('if ID exists', () => {
    const mockedResponse = {
      id: 1,
      user_id: 1,
      name: 'backlog',
      space_key: 'UNI-CHART',
      api_key: 'apikey1234567890',
      created_at: '2022-05-10T08:48:47.926Z',
      updated_at: '2022-05-10T08:48:47.927Z',
      projects: [
        {
          id: 1,
          name: 'project_name',
          key: 'unichart-key',
          project_id: 99846,
          provider_id: 1,
          created_at: '2022-05-10T09:26:03.707Z',
          updated_at: '2022-05-10T09:26:03.707Z'
        }
      ]
    }

    beforeEach(async () => {
      jest.spyOn(Provider.prototype, 'getProviderById').mockImplementationOnce(() => mockedResponse)

      req.params = { id: '1' }
      await Controller.getProviderById(req, res)
    })

    it('should return a status of 200', () => {
      expect(res.statusCode).toEqual(200)
    })

    it('should return the expected body', () => {
      expect(res._getData()).toEqual(mockedResponse)
    })
  })
})
