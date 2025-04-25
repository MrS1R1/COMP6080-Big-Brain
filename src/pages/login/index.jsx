import { Button, Checkbox, Form, Input, Flex, message} from 'antd';
import { LockOutlined, UserOutlined, SmileTwoTone } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import http from '../../utils/request';

function Login(){

    const navigate = useNavigate();

    const handleSubmit = (values) =>{
        const {email, password} = values;
        const data ={
            email, password
        }
        http.post('/admin/auth/login', data)
        .then(res =>{
            if (res && res.token) {
                localStorage.setItem('token', res.token);
                message.success('Log in successfully');
                navigate('/dashboard');
            }
        })
    }

    return (
        <Flex
        style={{ height: '100vh' }}
        justify="center"
        align="center"
        >
            <Form
            name="login"
            initialValues={{ remember: true }}
            style={{ maxWidth: 350, width:'50%' }}
            onFinish={handleSubmit}
            >
            
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <SmileTwoTone style={{ fontSize: 80 }} />
            <h1 style={{ marginTop: 8 }}>Big Brain</h1>
            </div>

            <Form.Item
                name="email"
                rules={[{ required: true, message: 'Please input your E-mail!' }]}
            >
                <Input prefix={<UserOutlined />} placeholder="Email" />
            </Form.Item>
            <Form.Item
                name="password"
                rules={[{ required: true, message: 'Please input your Password!' }]}
            >
                <Input.Password prefix={<LockOutlined />} type="password" placeholder="Password" />
            </Form.Item>
            <Form.Item>
                <Flex justify="space-between" align="center">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox>Remember me</Checkbox>
                </Form.Item>
                <a href="/register">Press here to register</a>
                </Flex>
            </Form.Item>
        
            <Form.Item>
                <Button block type="primary" htmlType="submit">
                Log in
                </Button>
            </Form.Item>
            </Form>
        </Flex>
      );
};

export default Login
