import React, { useEffect, useRef, useState } from 'react';
import { ethers, Contract, providers, Signer } from 'ethers';
import './App.css';
import { ESCROW_CONTRACT_ADDRESS, ESCROW_ABI } from './constants';
import Web3Modal from "web3modal";



function App() {
    // Initialize state variables
    const [agreementId, setAgreementId] = useState();
    // console.log(agreementId);

    const [serviceProviderAddress, setServiceProviderAddress] = useState();
    // console.log(serviceProviderAddress);

    const [clientAddress, setClientAddress] = useState();
 console.log(clientAddress,'current client');
    const [loading, setLoading] = useState(false);

    const [everyAgreement, setEveryAgreement] = useState([]);
    console.log(everyAgreement);

    const [funds, setFunds] = useState(0);
    // console.log(funds);

    const [totalNumOfAgreement, setTotalNumOfAgreements] = useState(0);

    const [fundsReleased, setFundsReleased] = useState(false);

    const web3ModalRef = useRef();

    const [walletConnected, setWalletConnected] = useState(false);


    const connectWallet = async () => {
        try {
            await getProviderOrSigner();
            setWalletConnected(true);
        } catch (error) {
            console.log(error);

        }
    }

    const getNumOfAgreements = async () => {
        try {
            const provider = await getProviderOrSigner();
            const contract = getEscrowContractInstance(provider);
            const numOfAgreements = await contract.numOfAgreement();
            setTotalNumOfAgreements(numOfAgreements);

        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (totalNumOfAgreement > 0) {
            fetchAllAgreements();
        }
    }, [totalNumOfAgreement])

    useEffect(() => {
        if (!walletConnected) {
            web3ModalRef.current = new Web3Modal({
                network: "goerli",
                providerOptions: {},
                disableInjectedProvider: false,
            });
            connectWallet().then(async () => {
                await getNumOfAgreements();
            })
        }
    }, []);



    // Create an escrow agreement and deposite fund
    const createAgreement = async () => {
        // Validate inputs
        if (agreementId == null || clientAddress == null || serviceProviderAddress == null || funds == null) {
            alert('Please enter all required fields.');
            return;
        }

        const signer = await getProviderOrSigner(true);
        const escroContract = getEscrowContractInstance(signer);
        // Send the transaction to create the escrow agreement
        const tx = await escroContract.createEscrowAgreement(agreementId, clientAddress, serviceProviderAddress, { value: ethers.utils.parseEther(funds) });
        setLoading(true)
        await tx.wait();
        setAgreementId("");
        setFunds(0)
        // Update the state to reflect the new escrow agreement
        setFundsReleased(false);

        getNumOfAgreements();
        setLoading(false);
        alert('Escrow agreement created successfully.');
        alert('Funds deposited successfully.');
    }



    function ParsedAgreement(agreeId, clientAdd, providerAdd, fund, released) {
        this.agreeId = agreeId;
        this.clientAdd = clientAdd;
        this.providerAdd = providerAdd;
        this.fund = fund;
        this.release = released
    }


    const fetchAgreementById = async (id) => {
        console.log('erntered fetch by id',id);

        try {
            const provider = await getProviderOrSigner();
            const escroContract = getEscrowContractInstance(provider);
            let agreement = await escroContract.agreements(id);

            const agrmnt = new ParsedAgreement(id, agreement.client, agreement.serviceProvider, agreement.funds.toNumber(), agreement.fundsReleased)

            console.log(agrmnt, 'agreement by ID');
            return agrmnt;

        } catch (error) {
            console.log(error);
        };
    }




    const fetchAllAgreements = async () => {
        // console.log('erntered fetch all');
        try {
            const allAgreements = [];
            console.log(totalNumOfAgreement);
            for (let i = 0; i < totalNumOfAgreement; i++) {
                const agreement = await fetchAgreementById(i);
                allAgreements.push(agreement);
            }
            setEveryAgreement(allAgreements);
        } catch (error) {
            console.log(error);
        }
    }

    // Release the funds to the service provider
    const release = async (id) => {
        // Validate inputs
        console.log(id, 'id');
        const signer = await getProviderOrSigner(true);
        const escroContract = getEscrowContractInstance(signer);

        // Send the transaction to release the funds
        const tx = await escroContract.releaseFunds(id);
        await tx.wait();

        // Update the state to reflect the funds being released
        setFundsReleased(true);
        alert('Funds released successfully.');
    }

    const cancel = async (id) => {
        // Validate inputs
        console.log(id, 'id');
        const signer = await getProviderOrSigner(true);
        const escroContract = getEscrowContractInstance(signer);

        // Send the transaction to release the funds
        const tx = await escroContract.cancel(id);
        await tx.wait();

        // Update the state to reflect the funds being released
        // setFundsReleased(true);
        alert('Agreement canceled.');
    }


    const getProviderOrSigner = async (needSigner = false) => {
        const provider = await web3ModalRef.current.connect();

        const web3Provider = new providers.Web3Provider(provider);
        // console.log((await userAddress).toLowerCase())
        const signerForUserAddress = await web3Provider.getSigner();
        const clientAddress = await signerForUserAddress.getAddress();
        setClientAddress(clientAddress);
        const { chainId } = await web3Provider.getNetwork();
        if (chainId !== 5) {
            window.alert("Please switch to the Goerli network!");
            throw new Error("Please switch to the Goerli network");
        }

        if (needSigner) {
            const signer = web3Provider.getSigner();
            return signer;
        }
        return web3Provider;
    }


    const getEscrowContractInstance = (providerOrSigner) => {
        return new Contract(
            ESCROW_CONTRACT_ADDRESS,
            ESCROW_ABI,
            providerOrSigner
        );
    };





    return (
        <>
            <div>

                <div className="main">
                    <div style={{ textAlign: "center" }}>
                        <h1>Wellcome to Escrow agreement creation </h1><br />
                        <h4>Total Number Of Agreements: {totalNumOfAgreement.toString()}</h4>
                        <p>client : {clientAddress}</p>
                    </div>
                    <div style={{ marginTop: "35px", alignItems: "center", textAlign: "center" }}>
                        <h2>Create Escrow Agreement </h2>
                       
                        <div>
                            <label>Service Provider</label><input
                                onChange={(e) => {
                                    setServiceProviderAddress(e.target.value)
                                }}
                            />
                        </div>
                        <div>
                            <label> Provide Fund</label><input
                                type='number'
                                onChange={(e) => {
                                    setFunds(e.target.value)
                                }}
                            />
                        </div>
                        <div>
                            <label> Agreement ID</label><input
                                type='number'
                                onChange={(e) => {
                                    setAgreementId(e.target.value)
                                }}
                            />
                        </div>
                        <div>
                            {loading ?
                                <button>Loading...</button>
                                :
                                <button
                                    onClick={createAgreement}
                                >Create Agreement</button>}

                        </div>
                    </div>


                    <div>
                        <h4>Escrow Agreements created by you</h4>
                        <div>
                            {everyAgreement && everyAgreement.map((agrmnt) => {
                                return (
                                    <>
                                        <div>
                                            <p>Agreement Id : {agrmnt.agreeId}</p>
                                            <p>Client : {agrmnt.clientAdd}</p>
                                            <p>Service Provider : {agrmnt.providerAdd}</p>
                                            <p>Fund : {agrmnt.fund / 1000000000000000000} Ether</p>
                                            <p>Fund status : {agrmnt.release ? 'Relaeased' : 'Not released'}</p>
                                            <button
                                                onClick={() => release(agrmnt.agreeId)}
                                            >Release Funds</button>


                                            <button
                                                onClick={() => cancel(agrmnt.agreeId)}
                                            >Cancel</button>


                                        </div>
                                    </>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default App;