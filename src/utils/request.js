import { message } from "antd";

const BASE_HOST = 'http://localhost:5005';

const defaultOptions = {
    method:'GET',
    headers:{
        'Content-Type':'application/json',
    }
}

function get(url){
    return(
        fetch(`${BASE_HOST}${url}`,{
            ...defaultOptions,
            headers:{
                ...defaultOptions.headers,
                Authorization:`Bearer ${window,localStorage.getItem('token')}`,
            }
        })
        .then((res)=>res.json())
        .then((data)=>{
            if(data.error){
                throw new Error(data.error);
            }
            return data;
        })
        .catch((err)=>message.error(err.message))
    )
}

/**
 * @param {*} url
 * @param {*} data
 * @returns
 */
function post(url,data){
    return(
        fetch(`${BASE_HOST}${url}`,{
            ...defaultOptions,
            method:'POST',
            headers:{
                ...defaultOptions.headers,
                Authorization:`Bearer ${window,localStorage.getItem('token')}`,
            },
            body: JSON.stringify(data),
        })
        .then((res)=>res.json())
        .then((data)=>{
            if(data.error){
                throw new Error(data.error);
            }
            return data;
        })
        .catch((err)=>message.error(err.message))
    )
}

/**
 * @param {*} url
 * @param {*} data
 * @returns
 */
function put(url,data){
    return(
        fetch(`${BASE_HOST}${url}`,{
            ...defaultOptions,
            method:'PUT',
            headers:{
                ...defaultOptions.headers,
                Authorization:`Bearer ${window,localStorage.getItem('token')}`,
            },
            body: JSON.stringify(data),
        })
        .then((res)=>res.json())
        .then((data)=>{
            if(data.error){
                throw new Error(data.error);
            }
            return data;
        })
        .catch((err)=>message.error(err.message))
    )
}
const http ={
    get,
    post,
    put,
}

export default http;