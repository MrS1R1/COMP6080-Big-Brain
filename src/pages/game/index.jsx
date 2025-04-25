import React, { useState, useEffect } from 'react';
import { Layout, Card, Button, Space, Typography, Modal, Form, Input, InputNumber, message, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import http from '../../utils/request';

const { Header } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

export default function GameEdit() {
    const [game, setGame] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [form] = Form.useForm();
    const params = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        fetchGame();
    }, [params.game_id]);

    const fetchGame = async () => {
        try {
            const response = await http.get('/admin/games');
            if (response && response.games) {
                const currentGame = response.games.find(g => String(g.id) === String(params.game_id));
                if (currentGame) {
                    setGame(currentGame);
                    setQuestions(currentGame.questions || []);
                } else {
                    message.error('Game does not exist');
                    navigate('/dashboard');
                }
            }
        } catch (error) {
            console.error('Failed to fetch game:', error);
            message.error('Failed to get game information');
        }
    };

    const showModal = (question = null) => {
        setEditingQuestion(question);
        if (question) {
            form.setFieldsValue(question);
        } else {
            form.resetFields();
        }
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingQuestion(null);
        form.resetFields();
    };

    const handleSubmit = async (values) => {
        try {
            const response = await http.get('/admin/games');
            if (response && response.games) {
                const allGames = response.games;
                const currentGameIndex = allGames.findIndex(g => String(g.id) === String(params.game_id));
                
                if (currentGameIndex !== -1) {
                    const updatedQuestions = editingQuestion
                        ? questions.map(q => q.id === editingQuestion.id ? { ...values, id: q.id } : q)
                        : [...questions, { ...values, id: Date.now().toString() }];

                    allGames[currentGameIndex] = {
                        ...allGames[currentGameIndex],
                        questions: updatedQuestions,
                        updatedAt: new Date().toISOString()
                    };

                    const updateResponse = await http.put('/admin/games', { games: allGames });
                    if (updateResponse) {
                        message.success(editingQuestion ? 'Question updated successfully' : 'Question added successfully');
                        setQuestions(updatedQuestions);
                        setIsModalVisible(false);
                        setEditingQuestion(null);
                        form.resetFields();
                    }
                }
            }
        } catch (error) {
            console.error('Failed to save question:', error);
            message.error('Failed to save question');
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        try {
            const response = await http.get('/admin/games');
            if (response && response.games) {
                const allGames = response.games;
                const currentGameIndex = allGames.findIndex(g => String(g.id) === String(params.game_id));
                
                if (currentGameIndex !== -1) {
                    const updatedQuestions = questions.filter(q => q.id !== questionId);
                    allGames[currentGameIndex] = {
                        ...allGames[currentGameIndex],
                        questions: updatedQuestions,
                        updatedAt: new Date().toISOString()
                    };

                    const updateResponse = await http.put('/admin/games', { games: allGames });
                    if (updateResponse) {
                        message.success('Question deleted successfully');
                        setQuestions(updatedQuestions);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to delete question:', error);
            message.error('Failed to delete question');
        }
    };

    const handleEditQuestion = (question) => {
        navigate(`/game/${params.game_id}/question/${question.id}`);
    };

    if (!game) {
        return <div>加载中...</div>;
    }

    return (
        <Layout>
            <Header style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: '#fff',
                padding: '0 24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <Title level={3} style={{ margin: 0 }}>{game.name}</Title>
                <Space>
                    <Button onClick={() => navigate(`/game-management/${params.game_id}`)}>
                        Game Management
                    </Button>
                    <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
                </Space>
            </Header>
            <div style={{ padding: '24px' }}>
                <Card title="Question Management" extra={
                    <Button type="primary" onClick={() => showModal()}>
                        Add Question
                    </Button>
                }>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        {questions.map(question => (
                            <Card key={question.id} style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <Title level={4}>{question.title}</Title>
                                        <Text>{question.description}</Text>
                                        <br />
                                        <Text type="secondary">Answer time: {question.time} seconds</Text>
                                    </div>
                                    <Space>
                                        <Button 
                                            type="primary" 
                                            icon={<EditOutlined />}
                                            onClick={() => handleEditQuestion(question)}
                                        >
                                            Edit
                                        </Button>
                                        <Popconfirm
                                            title="Delete question"
                                            description="Are you sure you want to delete this question?"
                                            onConfirm={() => handleDeleteQuestion(question.id)}
                                            okText="Yes"
                                            cancelText="No"
                                        >
                                            <Button 
                                                danger 
                                                icon={<DeleteOutlined />}
                                            >
                                                Delete
                                            </Button>
                                        </Popconfirm>
                                    </Space>
                                </div>
                            </Card>
                        ))}
                    </Space>
                </Card>
            </div>

            <Modal
                title={editingQuestion ? "Edit Question" : "Add Question"}
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="title"
                        label="Question Title"
                        rules={[{ required: true, message: 'Please enter the question title!' }]}
                    >
                        <Input placeholder="Please enter the question title" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Question Description"
                        rules={[{ required: true, message: 'Please enter the question description!' }]}
                    >
                        <TextArea rows={4} placeholder="Please enter the question description" />
                    </Form.Item>

                    <Form.Item
                        name="time"
                        label="Answer time (seconds)"
                        rules={[{ required: true, message: 'Please enter the answer time!' }]}
                    >
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" style={{ marginRight: '8px' }}>
                            {editingQuestion ? 'Update' : 'Add'}
                        </Button>
                        <Button onClick={handleCancel}>
                            Cancel
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
}