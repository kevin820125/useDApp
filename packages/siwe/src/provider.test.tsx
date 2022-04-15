import { AuthResponse, NonceResponse, LogoutResponse, SiweFetchers } from './requests'
import { setupTestingConfig, TestingNetwork } from '@usedapp/core/testing'
import { useSiwe } from './provider'
import { Config, useEthers } from '@usedapp/core'
import { renderSiweHook } from './testing/renderSiweHook'
import { expect } from 'chai'
import { useEffect } from 'react'

const testSiweFetchers = (account: string): SiweFetchers => {
    return {
        getNonce: async (): Promise<NonceResponse> => ({
                    nonce: '4ipxY6MVdjy6mbNm8',
                    ok: true,
                })
        ,
        getAuth: async (): Promise<AuthResponse> => ({
                    address: account,
                    ok: true,
                }),
        login: async (): Promise<AuthResponse> => ({
                    address: account,
                    ok: true,
                }),
        logout: async (): Promise<LogoutResponse> => ({
                    ok: true,
                })
    }
}

describe('siwe provider tests', () => {
    let account: string
    let config: Config
    let network1: TestingNetwork

    before(async () => {
        ({ config, network1 } = await setupTestingConfig())
        account = network1.wallets[0].address
    })

    it('return initialized values', async () => {
        const { result, waitForCurrent } = await renderSiweHook(() => useSiwe(), { config, siweFetchers: testSiweFetchers(account), })
        await waitForCurrent((val) => val !== undefined)
        expect(result.error).to.be.undefined
        expect(result.current.isLoggedIn).to.be.false
        expect(result.current.signIn).to.be.a('function')
        expect(result.current.signOut).to.be.a('function')
    })

    it('return login session', async () => {
        const { result, waitForCurrent } = await renderSiweHook(() => {
            const { activate } = useEthers()
            useEffect(() => {
            activate(network1.provider)
            }, [])        
            return useSiwe()
        },
        {
            config, 
            siweFetchers: testSiweFetchers(account),
        })
        await waitForCurrent((val) => val.isLoggedIn)
        expect(result.error).to.be.undefined
        expect(result.current.isLoggedIn).to.be.true
    })

    it('logout correctly', async () => {
        const { result, waitForCurrent } = await renderSiweHook(() => {
            const { activate } = useEthers()
            useEffect(() => {
            activate(network1.provider)
            }, [])        
            return useSiwe()
        },
        {
            config, 
            siweFetchers: testSiweFetchers(account),
        })
        await waitForCurrent((val) => val.isLoggedIn)
        expect(result.error).to.be.undefined
        expect(result.current.isLoggedIn).to.be.true
        result.current.signOut()
        await waitForCurrent((val) => !val.isLoggedIn)
        expect(result.current.isLoggedIn).to.be.false
    })

    it('do not active session for wrong account', async () => {
        const { result, waitForCurrent } = await renderSiweHook(() => {
            const { activate } = useEthers()
            useEffect(() => {
            activate(network1.provider)
            }, [])        
            return useSiwe()
        },
        {
            config, 
            siweFetchers: {
                ...testSiweFetchers(account),
                getAuth: async (): Promise<AuthResponse> => ({
                    address: network1.wallets[1].address,
                    ok: true,
                }),
                login: async (): Promise<AuthResponse> => ({
                    address: account,
                    ok: true,
                }),
            },
        })
        await waitForCurrent((val) => val !== undefined)
        expect(result.current.isLoggedIn).to.be.false
        result.current.signIn()
        expect(result.current.isLoggedIn).to.be.false
    })
})